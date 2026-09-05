import yaml
import logging
import imaplib
import json
import email
import os
import re
import subprocess
import tempfile

from io import BytesIO
from datetime import datetime, timedelta

from email.header import decode_header
from pypdf import PdfReader
from supabase import create_client


# ============================================================
# SETTINGS
# ============================================================

DAYS_TO_SEARCH = int(os.environ.get("DAYS_TO_SEARCH", 1))

EMAILS_FILE = "Email Scraper/emails.json"
OUTPUT_FILE = "Email Scraper/docket_emails.json"
CREDENTIALS_FILE = "Email Scraper/credentials.yaml"

SUPABASE_BUCKET = "dockets"


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)


# ============================================================
# LOAD CREDENTIALS
# ============================================================

def load_credentials(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as file:
            credentials = yaml.safe_load(file)

        required_keys = [
            "user",
            "password",
            "supabase_url",
            "supabase_key"
        ]

        for key in required_keys:
            if key not in credentials:
                raise KeyError(
                    f"Missing '{key}' in credentials file"
                )

        return credentials

    except Exception as e:
        logging.error(
            f"Failed to load credentials: {e}"
        )
        raise


# ============================================================
# CONNECT TO GMAIL
# ============================================================

def connect_to_gmail_imap(user, password):

    imap_url = "imap.gmail.com"

    try:
        mail = imaplib.IMAP4_SSL(imap_url)

        mail.login(user, password)

        mail.select("INBOX")

        logging.info("Connected to Gmail")

        return mail

    except Exception as e:
        logging.error(
            f"Failed to connect to Gmail: {e}"
        )
        raise


# ============================================================
# CONNECT TO SUPABASE
# ============================================================

def connect_to_supabase(credentials):

    try:
        url = credentials["supabase_url"]
        key = credentials["supabase_key"]

        supabase = create_client(url, key)

        logging.info("Connected to Supabase")

        return supabase

    except Exception as e:
        logging.error(
            f"Failed to connect to Supabase: {e}"
        )
        raise


# ============================================================
# DECODE EMAIL HEADER
# ============================================================

def decode_email_header(value):

    if not value:
        return ""

    try:
        decoded_parts = decode_header(value)

        result = ""

        for part, encoding in decoded_parts:

            if isinstance(part, bytes):

                result += part.decode(
                    encoding or "utf-8",
                    errors="replace"
                )

            else:
                result += part

        return result

    except Exception:
        return str(value)


# ============================================================
# GET EMAIL BODY
# ============================================================

def get_email_body(msg):

    if msg.is_multipart():

        for part in msg.walk():

            if part.get_content_type() == "text/plain":

                payload = part.get_payload(
                    decode=True
                )

                if payload:

                    return payload.decode(
                        part.get_content_charset() or "utf-8",
                        errors="replace"
                    )

    else:

        payload = msg.get_payload(
            decode=True
        )

        if payload:

            return payload.decode(
                msg.get_content_charset() or "utf-8",
                errors="replace"
            )

    return ""


# ============================================================
# PDF TEXT EXTRACTION
# ============================================================

def extract_pdf_text(pdf_data):

    try:

        reader = PdfReader(
            BytesIO(pdf_data)
        )

        text = ""

        for page in reader.pages:

            page_text = page.extract_text()

            if page_text:
                text += page_text + "\n"

        return text

    except Exception as e:

        logging.error(
            f"Failed to extract PDF text: {e}"
        )

        return ""


# ============================================================
# EXTRACT PDF TEXT (LAYOUT-PRESERVING)
# ============================================================

def extract_pdf_text_layout(pdf_data, page=1):
    """
    Extract text using poppler's pdftotext -layout instead of pypdf.

    Needed for dockets built from positioned form fields (e.g. Barro),
    where pypdf's reading order scrambles labels and values. pdftotext
    -layout keeps text aligned to its visual column, which the Barro
    parser relies on.
    """

    try:

        with tempfile.NamedTemporaryFile(suffix=".pdf") as pdf_file:

            pdf_file.write(pdf_data)
            pdf_file.flush()

            result = subprocess.run(
                [
                    "pdftotext",
                    "-layout",
                    "-f", str(page),
                    "-l", str(page),
                    pdf_file.name,
                    "-"
                ],
                capture_output=True,
                text=True,
                check=True
            )

            return result.stdout

    except Exception as e:

        logging.error(
            f"Failed to extract layout PDF text: {e}"
        )

        return ""


# ============================================================
# CLEAN PDF TEXT
# ============================================================

def clean_pdf_text(text):

    text = text.replace(
        "\r\n",
        "\n"
    )

    text = text.replace(
        "\r",
        "\n"
    )

    lines = []

    for line in text.split("\n"):

        line = line.strip()

        if line:
            lines.append(line)

    return lines


# ============================================================
# GET VALUE AFTER LABEL
# ============================================================

def get_value_after_label(lines, label):

    label = label.lower().strip()

    for i, line in enumerate(lines):

        if line.lower().strip() == label:

            if i + 1 < len(lines):

                return lines[i + 1].strip()

    return None


# ============================================================
# GET VALUE FROM SAME LINE
# ============================================================

def get_value_same_line(lines, label):

    label = label.lower()

    for line in lines:

        if line.lower().startswith(label):

            value = line[len(label):].strip()

            if value:
                return value

    return None


# ============================================================
# GET TIME ON SITE FIELDS
# ============================================================

def get_time_on_site_fields(lines):
    """
    Extracts Arrive Jobsite, Time Finished, and Total Time on Site
    together, since pypdf's extraction order for this docket section
    is inconsistent between two layouts:

      1. Inline: "Arrive Jobsite 08:12 Batch + Moisture" - the value
         sits on the same line as its label (Total Time on Site is
         never inline - its label alone spans two lines: "Total Time
         on" / "Site (HH:MM)").
      2. Block: "Arrive Jobsite" / "Time Finished" / "Total Time on"
         / "Site (HH:MM)" print as bare labels, and only afterwards
         do "08:14" / "08:22" / "0:8:0" print as a separate block of
         values, in the same order as their labels.

    A fixed line offset only handles one of these - whichever labels
    lack an inline value are resolved by scanning forward from the
    last label for a run of time-like values and assigning them in
    label order.
    """

    result = {
        "arrive_jobsite": None,
        "time_finished": None,
        "total_time_on_site": None
    }

    anchors = []

    for i, line in enumerate(lines):

        stripped = line.strip()
        lower = stripped.lower()

        if (
            lower.startswith("arrive jobsite")
            and not any(key == "arrive_jobsite" for key, *_ in anchors)
        ):
            rest = stripped[len("Arrive Jobsite"):].strip()
            inline_match = re.match(r"(\d{1,2}:\d{2})\b", rest)

            anchors.append((
                "arrive_jobsite",
                i,
                inline_match.group(1) if inline_match else None
            ))

        elif (
            lower.startswith("time finished")
            and not any(key == "time_finished" for key, *_ in anchors)
        ):
            rest = stripped[len("Time Finished"):].strip()
            inline_match = re.match(r"(\d{1,2}:\d{2})\b", rest)

            anchors.append((
                "time_finished",
                i,
                inline_match.group(1) if inline_match else None
            ))

        elif (
            stripped == "Total Time on"
            and not any(key == "total_time_on_site" for key, *_ in anchors)
            and i + 1 < len(lines)
            and lines[i + 1].strip().startswith("Site (HH:MM)")
        ):
            anchors.append((
                "total_time_on_site",
                i + 1,
                None
            ))

    for key, _, inline_value in anchors:

        if inline_value is not None:
            result[key] = inline_value

    missing = [
        (key, end_idx)
        for key, end_idx, inline_value in anchors
        if inline_value is None
    ]

    if missing:

        scan_start = max(end_idx for _, end_idx, _ in anchors) + 1
        found_values = []
        j = scan_start

        while j < len(lines) and len(found_values) < len(missing):

            match = re.match(
                r"(\d{1,3}:\d{1,2}(?::\d{1,2})?)",
                lines[j].strip()
            )

            if not match:
                break

            found_values.append(match.group(1))
            j += 1

        for (key, _), value in zip(missing, found_values):
            result[key] = value

    return result


# ============================================================
# GET NET WEIGHT
# ============================================================

def get_net_weight(lines):
    """
    Aggregates dockets print "Net Weight" as "This" / "load/NetWeight"
    across two lines (or "This load" / "/NetWeight" in the pricing
    section) - no space before "Weight" and no line matching the
    plain "Net Weight" label get_value_after_label expects.
    """

    for i, line in enumerate(lines):

        if line.strip().lower().endswith("netweight"):

            if i + 1 < len(lines):
                return lines[i + 1].strip()

    return None


# ============================================================
# EXTRACT NUMBER
# ============================================================

def extract_number(value):

    if value is None:
        return None

    value = str(value).replace(",", "")

    match = re.search(
        r"-?\d+(?:\.\d+)?",
        value
    )

    if not match:
        return None

    number = match.group()

    try:

        if "." in number:
            return float(number)

        return int(number)

    except ValueError:
        return None


# ============================================================
# NORMALIZE DATE
# ============================================================

def normalize_date(value):

    if not value:
        return None

    value = value.strip()

    formats = [
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%d/%m/%y",
        "%d-%m-%y",
        "%Y-%m-%d",
        "%d %b %Y",
        "%d %B %Y",
        "%d-%b-%Y",
        "%d-%b-%y",
        "%d-%B-%Y",
        "%d-%B-%y"
    ]

    for date_format in formats:

        try:

            return datetime.strptime(
                value,
                date_format
            ).strftime("%Y-%m-%d")

        except ValueError:
            continue

    logging.warning(
        f"Could not normalize date: {value}"
    )

    return None


# ============================================================
# NORMALIZE TIME
# ============================================================

def normalize_time(value):

    if not value:
        return None

    value = value.strip()

    formats = [
        "%H:%M",
        "%H:%M:%S",
        "%I:%M %p",
        "%I:%M:%S %p"
    ]

    for time_format in formats:

        try:

            return datetime.strptime(
                value,
                time_format
            ).strftime("%H:%M:%S")

        except ValueError:
            continue

    logging.warning(
        f"Could not normalize time: {value}"
    )

    return None


# ============================================================
# COMBINE DATE + TIME
# ============================================================

def combine_date_time(date_value, time_value):

    date_value = normalize_date(
        date_value
    )

    time_value = normalize_time(
        time_value
    )

    if not date_value or not time_value:
        return None

    return f"{date_value}T{time_value}"


# ============================================================
# TIME DIFFERENCE (HH:MM STRINGS -> H:M:S DURATION)
# ============================================================

def time_diff_hms(start_value, end_value):
    """
    Duration between two same-day "HH:MM" clock times, as an "H:M:S"
    string for normalize_interval. Used where a docket prints arrival
    and finish times but no separate total-time-on-site figure (e.g.
    Barro), so the site duration has to be computed rather than read.
    """

    start_time = normalize_time(start_value)
    end_time = normalize_time(end_value)

    if not start_time or not end_time:
        return None

    start_dt = datetime.strptime(start_time, "%H:%M:%S")
    end_dt = datetime.strptime(end_time, "%H:%M:%S")

    if end_dt < start_dt:
        return None

    seconds = int((end_dt - start_dt).total_seconds())

    hours, remainder = divmod(seconds, 3600)
    minutes, secs = divmod(remainder, 60)

    return f"{hours}:{minutes}:{secs}"


# ============================================================
# NORMALIZE INTERVAL
# ============================================================

def normalize_interval(value):

    if not value:
        return None

    value = value.strip()

    match = re.match(
        r"^(\d{1,3}):(\d{1,2})(?::(\d{1,2}))?",
        value
    )

    if not match:
        return None

    hours = int(match.group(1))
    minutes = int(match.group(2))
    seconds = int(match.group(3) or 0)

    return (
        f"{hours:02d}:"
        f"{minutes:02d}:"
        f"{seconds:02d}"
    )


# ============================================================
# PARSE CONCRETE DOCKET
# ============================================================

def parse_concrete_docket(lines):

    time_on_site_fields = get_time_on_site_fields(lines)

    docket = {

        "docket_type": "concrete",

        "date": get_value_after_label(
            lines,
            "Date"
        ),

        "command_job_no": get_value_after_label(
            lines,
            "Command Job No."
        ),

        "plant_name": get_value_after_label(
            lines,
            "Plant Name"
        ),

        "plant_no": get_value_after_label(
            lines,
            "Plant No."
        ),

        "docket_no": get_value_after_label(
            lines,
            "Docket No."
        ),

        "customer_no": get_value_after_label(
            lines,
            "Customer No."
        ),

        "customer_name": get_value_after_label(
            lines,
            "Customer Name"
        ),

        "time_printed": get_value_after_label(
            lines,
            "Time Printed"
        ),

        "time_batched": get_value_after_label(
            lines,
            "Time Batched"
        ),

        "delivery_address": get_value_after_label(
            lines,
            "Delivery Address & Instructions"
        ),

        "total_order_m3": extract_number(
            get_value_after_label(
                lines,
                "Total Order M3"
            )
        ),

        "progressive_m3": extract_number(
            get_value_after_label(
                lines,
                "Progressive M3"
            )
        ),

        "this_load_m3": extract_number(
            get_value_after_label(
                lines,
                "This Load M3"
            )
        ),

        "truck_no": get_value_after_label(
            lines,
            "Truck No."
        ),

        "klm_zone_map_ref": get_value_after_label(
            lines,
            "Klm / Zone / Map Ref"
        ),

        "design_slump": extract_number(
            get_value_after_label(
                lines,
                "Design Slump"
            )
        ),

        "material_code": get_value_after_label(
            lines,
            "Material Code / Strength MPa"
        ),

        "mix_description": get_value_after_label(
            lines,
            "Mix Description"
        ),

        "arrive_jobsite": time_on_site_fields["arrive_jobsite"],

        "time_finished": time_on_site_fields["time_finished"],

        "total_time_on_site": time_on_site_fields["total_time_on_site"],

        "water_added": extract_number(
            get_value_after_label(
                lines,
                "Batch + Moisture"
            )
        ),

        "slump_stand": extract_number(
            get_value_after_label(
                lines,
                "Slump Stand"
            )
        ),

        "quantity_returned": extract_number(
            get_value_after_label(
                lines,
                "Quantity Returned"
            )
        ),

        "max_water": extract_number(
            get_value_after_label(
                lines,
                "Max. Water"
            )
        ),

        "lat_long": get_value_after_label(
            lines,
            "Lat-Long :"
        )
    }

    return docket


# ============================================================
# PARSE AGGREGATES DOCKET
# ============================================================

def parse_aggregates_docket(lines):

    time_on_site_fields = get_time_on_site_fields(lines)

    docket = {

        "docket_type": "aggregates",

        "date": get_value_after_label(
            lines,
            "Date"
        ),

        "command_job_no": get_value_after_label(
            lines,
            "Command Job No."
        ),

        "plant_name": get_value_after_label(
            lines,
            "Plant Name"
        ),

        "plant_no": get_value_after_label(
            lines,
            "Plant No."
        ),

        "docket_no": get_value_after_label(
            lines,
            "Docket No."
        ),

        "customer_no": get_value_after_label(
            lines,
            "Customer No."
        ),

        "customer_name": get_value_after_label(
            lines,
            "Customer Name"
        ),

        "time_dispatched": get_value_after_label(
            lines,
            "Time Dispatched"
        ),

        "delivery_address": get_value_after_label(
            lines,
            "Delivery Address & Instructions"
        ),

        "purchase_order": get_value_after_label(
            lines,
            "Customer Purchase Order No."
        ),

        "total_weight": extract_number(
            get_value_after_label(
                lines,
                "Total Weight"
            )
        ),

        "gross_weight": extract_number(
            get_value_after_label(
                lines,
                "Gross Weight"
            )
        ),

        "tare_weight": extract_number(
            get_value_after_label(
                lines,
                "Tare Weight"
            )
        ),

        "net_weight": extract_number(
            get_net_weight(
                lines
            )
        ),

        "truck_no": get_value_after_label(
            lines,
            "Truck No."
        ),

        "vehicle_reg": get_value_after_label(
            lines,
            "Vehicle Reg"
        ),

        "fleet_no": get_value_after_label(
            lines,
            "Fleet No."
        ),

        "kms": extract_number(
            get_value_after_label(
                lines,
                "Kms"
            )
        ),

        "material_code": (
            get_value_after_label(
                lines,
                "Primary Material Code"
            )
            or get_value_after_label(
                lines,
                "Material Code"
            )
        ),

        "product": (
            get_value_after_label(
                lines,
                "Product Description"
            )
            or get_value_after_label(
                lines,
                "Product"
            )
        ),

        "arrive_jobsite": time_on_site_fields["arrive_jobsite"],

        "time_finished": time_on_site_fields["time_finished"],

        "total_time_on_site": time_on_site_fields["total_time_on_site"]
    }

    return docket


# ============================================================
# SLICE FIXED-WIDTH ROW BY HEADER COLUMN POSITIONS
# ============================================================

def slice_by_header(header_line, value_line, labels):
    """
    Given a header row and its value row from pdftotext -layout output,
    slice the value row at the same character offsets the labels start
    at in the header row. Assumes labels appear in header_line in order.
    """

    starts = []
    pos = 0

    for label in labels:

        idx = header_line.find(label, pos)

        if idx == -1:
            return None

        starts.append(idx)
        pos = idx + len(label)

    result = {}

    for i, label in enumerate(labels):

        start = starts[i]
        end = starts[i + 1] if i + 1 < len(starts) else len(value_line)

        result[label] = (
            value_line[start:end].strip()
            if start < len(value_line)
            else ""
        )

    return result


# ============================================================
# FIND HEADER ROW + ITS VALUE ROW
# ============================================================

def find_header_and_value(lines, header_prefix):

    for i, line in enumerate(lines):

        if line.strip().startswith(header_prefix):

            for j in range(i + 1, len(lines)):

                if lines[j].strip():
                    return line, lines[j], j

            return line, "", i

    return None, None, None


def find_header_and_aligned_value(lines, header_prefix, max_lookahead=6):
    """
    Like find_header_and_value, but skips candidate lines that have no
    content at the header's own column. pdftotext -layout sometimes
    places stray text from an unrelated column on the very next line,
    which a plain "next non-blank line" search would pick up wrongly.
    """

    for i, line in enumerate(lines):

        if not line.strip().startswith(header_prefix):
            continue

        col = line.find(header_prefix)

        for j in range(i + 1, min(i + 1 + max_lookahead, len(lines))):

            candidate = lines[j]

            if len(candidate) > col and candidate[col] not in (" ", ""):
                return line, candidate, j

        return line, "", i

    return None, None, None


# ============================================================
# PARSE BARRO DOCKET
# ============================================================

def parse_barro_docket(text):
    """
    Barro Group ("PRONTO CONCRETE") delivery dockets are a positioned
    form, not a simple label-then-value layout like Holcim's. This
    parser expects text from extract_pdf_text_layout (pdftotext -layout),
    which keeps fields aligned to their visual columns.
    """

    lines = text.split("\n")

    docket = {
        "docket_type": "concrete"
    }

    # --------------------------------------------------------
    # Plant name, e.g. "SUNSHINE PLANT"
    # --------------------------------------------------------

    plant_match = re.search(
        r"([A-Z]+)\s+PLANT\b",
        text
    )

    if plant_match:

        docket["plant_name"] = plant_match.group(1)

        # Barro has no numeric plant code - reuse the plant name so the
        # (docket_number, docket_type, plant_number) uniqueness check
        # still works.
        docket["plant_no"] = plant_match.group(1)

    # --------------------------------------------------------
    # JOB NO / ACCOUNT NO / CUSTOMER / DATE
    # (docket number is an unlabeled number trailing the DATE column)
    # --------------------------------------------------------

    header, value, _ = find_header_and_value(
        lines,
        "JOB NO."
    )

    if header:

        cols = slice_by_header(
            header,
            value,
            ["JOB NO.", "ACCOUNT NO.", "CUSTOMER", "DATE"]
        )

        if cols:

            docket["command_job_no"] = cols["JOB NO."] or None
            docket["customer_no"] = cols["ACCOUNT NO."] or None
            docket["customer_name"] = cols["CUSTOMER"] or None

            date_match = re.match(
                r"\s*(\d{2}/\d{2}/\d{2})\s*(\d+)?",
                cols["DATE"]
            )

            if date_match:

                docket["date"] = date_match.group(1)
                docket["docket_no"] = date_match.group(2)

    # --------------------------------------------------------
    # QUOTE NO / DELIVERY ADDRESS (+ wrapped continuation lines)
    # --------------------------------------------------------

    header, value, value_idx = find_header_and_value(
        lines,
        "QUOTE NO."
    )

    if header:

        cols = slice_by_header(
            header,
            value,
            ["QUOTE NO.", "DELIVERY ADDRESS"]
        )

        if cols:

            docket["quote_no"] = cols["QUOTE NO."] or None

            address_parts = [cols["DELIVERY ADDRESS"]]

            for j in range(value_idx + 1, len(lines)):

                stripped = lines[j].strip()

                if not stripped:
                    continue

                if re.match(
                    r"^(ORDER NO\.|MAP REFERENCE|TRUCK NO\.)",
                    stripped
                ):
                    break

                address_parts.append(stripped)

            docket["delivery_address"] = " ".join(
                part for part in address_parts if part
            ).strip() or None

    # --------------------------------------------------------
    # MIX description + TIME OUT / TIME ARRIVED / FINISH POUR
    #
    # These sit on one physical row together with START POUR. Anchor
    # on that row's shape (text, big gap, four HH:MM tokens) rather
    # than column position, since blank/short fields elsewhere shift
    # pdftotext's layout columns around and break position-based slicing.
    # --------------------------------------------------------

    row_match = re.search(
        r"^\s*(\S.*?\S)\s{4,}"
        r"(\d{2}:\d{2})\s+(\d{2}:\d{2})\s+(\d{2}:\d{2})\s+(\d{2}:\d{2})\s*$",
        text,
        re.MULTILINE
    )

    if row_match:

        docket["mix_description"] = row_match.group(1).strip() or None
        docket["time_dispatched"] = row_match.group(2)
        docket["arrive_jobsite"] = row_match.group(3)
        docket["time_finished"] = row_match.group(5)

        # Barro's docket has no printed "total time on site" figure
        # (unlike Holcim's) - compute it from arrival to finish.
        docket["total_time_on_site"] = time_diff_hms(
            row_match.group(3),
            row_match.group(5)
        )

    # --------------------------------------------------------
    # TRUCK NO / DRIVER NO
    # --------------------------------------------------------

    header, value, _ = find_header_and_aligned_value(
        lines,
        "TRUCK NO."
    )

    if header:

        cols = slice_by_header(
            header,
            value,
            ["TRUCK NO.", "DRIVER NO."]
        )

        if cols:

            docket["truck_no"] = cols["TRUCK NO."].strip() or None

            driver_match = re.match(
                r"\s*(\d+)",
                cols["DRIVER NO."]
            )

            docket["driver_no"] = (
                driver_match.group(1) if driver_match else None
            )

    # --------------------------------------------------------
    # WAITING TIME (minutes)
    # --------------------------------------------------------

    waiting_time_match = re.search(
        r"WAITING TIME\s+(\d+)\s*mins?",
        text,
        re.IGNORECASE
    )

    if waiting_time_match:

        minutes = int(waiting_time_match.group(1))

        docket["waiting_time"] = f"0:{minutes}:0"

    # --------------------------------------------------------
    # QUANTITY DELIVERED / PROGRESSIVE TOTAL - two M3 values on one line
    # --------------------------------------------------------

    qty_match = re.search(
        r"(\d+\.\d+)\s*M3\s+(\d+\.\d+)\s*M3",
        text
    )

    if qty_match:

        docket["this_load_m3"] = float(qty_match.group(1))
        docket["progressive_m3"] = float(qty_match.group(2))

    return docket


# ============================================================
# PARSE DOCKET PDF
# ============================================================

def parse_docket_pdf(pdf_data):

    text = extract_pdf_text(
        pdf_data
    )

    if not text:

        logging.warning(
            "No text could be extracted from PDF"
        )

        return None

    lines = clean_pdf_text(
        text
    )

    if any(
        "BARRO GROUP" in line
        for line in lines
    ):

        layout_text = extract_pdf_text_layout(
            pdf_data,
            page=1
        )

        if not layout_text:

            logging.warning(
                "Could not extract layout text for Barro docket"
            )

            return {
                "docket_type": "unknown",
                "raw_text": text
            }

        return parse_barro_docket(
            layout_text
        )

    if any(
        "Raw Materials" in line
        for line in lines
    ):

        return parse_aggregates_docket(
            lines
        )

    if any(
        "Concrete" in line
        for line in lines
    ):

        return parse_concrete_docket(
            lines
        )

    logging.warning(
        "Could not determine docket type"
    )

    return {
        "docket_type": "unknown",
        "raw_text": text
    }


# ============================================================
# GET OR CREATE TRUCK
# ============================================================

def get_or_create_truck(
    supabase,
    truck_number,
    registration=None
):

    if not truck_number:
        return None

    truck_number = str(
        truck_number
    ).strip()

    if not truck_number:
        return None

    try:

        response = (
            supabase
            .table("trucks")
            .select("id, registration")
            .eq(
                "truck_number",
                truck_number
            )
            .limit(1)
            .execute()
        )

        if response.data:

            truck = response.data[0]

            truck_id = truck["id"]

            if (
                registration
                and not truck.get("registration")
            ):

                (
                    supabase
                    .table("trucks")
                    .update({
                        "registration": registration
                    })
                    .eq(
                        "id",
                        truck_id
                    )
                    .execute()
                )

            return truck_id

        truck_data = {
            "truck_number": truck_number,
            "registration": registration,
            "active": True
        }

        response = (
            supabase
            .table("trucks")
            .insert(truck_data)
            .execute()
        )

        if not response.data:

            raise RuntimeError(
                f"Failed to create truck {truck_number}"
            )

        truck_id = response.data[0]["id"]

        logging.info(
            f"Created new truck: {truck_number}"
        )

        return truck_id

    except Exception as e:

        logging.error(
            f"Failed to get/create truck "
            f"{truck_number}: {e}"
        )

        raise


# ============================================================
# CHECK FOR EXISTING DOCKET
# ============================================================

def get_existing_docket(
    supabase,
    docket_data
):
    """
    Check whether the business-level docket already exists.

    Uniqueness is based on:

        docket_number
        docket_type
        plant_number
    """

    docket_number = docket_data.get(
        "docket_no"
    )

    docket_type = docket_data.get(
        "docket_type"
    )

    plant_number = docket_data.get(
        "plant_no"
    )

    if not docket_number:
        return None

    try:

        query = (
            supabase
            .table("dockets")
            .select(
                "id, pdf_path"
            )
            .eq(
                "docket_number",
                docket_number
            )
            .eq(
                "docket_type",
                docket_type
            )
        )

        if plant_number:

            query = query.eq(
                "plant_number",
                plant_number
            )

        response = (
            query
            .limit(1)
            .execute()
        )

        if response.data:

            return response.data[0]

        return None

    except Exception as e:

        logging.error(
            f"Failed to check existing docket "
            f"{docket_number}: {e}"
        )

        raise


# ============================================================
# UPLOAD PDF TO SUPABASE STORAGE
# ============================================================

def upload_pdf_to_supabase(
    supabase,
    pdf_data,
    filename,
    docket_number,
    docket_type
):
    """
    Upload PDF directly from memory.

    No local PDF file is created.

    Storage structure:

        dockets/
            concrete/
                123456/
                    original.pdf

            aggregates/
                987654/
                    original.pdf
    """

    filename = os.path.basename(
        filename
    )

    storage_path = (
        f"{docket_type}/"
        f"{docket_number}/"
        f"{filename}"
    )

    try:

        supabase.storage \
            .from_(SUPABASE_BUCKET) \
            .upload(
                storage_path,
                pdf_data,
                {
                    "content-type": "application/pdf",
                    "upsert": "false"
                }
            )

        logging.info(
            f"Uploaded PDF: {storage_path}"
        )

        return storage_path

    except Exception as e:

        error_text = str(e).lower()

        if "already exists" in error_text or "duplicate" in error_text:

            logging.warning(
                f"PDF already present in storage at "
                f"{storage_path}, reusing it "
                f"(likely a retry after a partial failure)"
            )

            return storage_path

        logging.error(
            f"Failed to upload PDF "
            f"{filename}: {e}"
        )

        raise


# ============================================================
# INSERT DOCKET
# ============================================================

def insert_docket(
    supabase,
    docket_data,
    email_data,
    pdf_path
):

    truck_id = get_or_create_truck(
        supabase,
        docket_data.get("truck_no"),
        docket_data.get("vehicle_reg")
    )

    docket_date = normalize_date(
        docket_data.get("date")
    )

    time_dispatched = None

    if docket_data.get("time_dispatched"):

        time_dispatched = combine_date_time(
            docket_data.get("date"),
            docket_data.get("time_dispatched")
        )

    time_batched = None

    if docket_data.get("time_batched"):

        time_batched = combine_date_time(
            docket_data.get("date"),
            docket_data.get("time_batched")
        )

    arrive_jobsite = None

    if docket_data.get("arrive_jobsite"):

        arrive_jobsite = combine_date_time(
            docket_data.get("date"),
            docket_data.get("arrive_jobsite")
        )

    time_finished = None

    if docket_data.get("time_finished"):

        time_finished = combine_date_time(
            docket_data.get("date"),
            docket_data.get("time_finished")
        )

    total_time_on_site = normalize_interval(
        docket_data.get(
            "total_time_on_site"
        )
    )

    waiting_time = normalize_interval(
        docket_data.get(
            "waiting_time"
        )
    )

    docket = {

        "docket_number": docket_data.get(
            "docket_no"
        ),

        "docket_type": docket_data.get(
            "docket_type"
        ),

        "docket_date": docket_date,

        "email_sender": email_data.get(
            "from"
        ),

        "email_subject": email_data.get(
            "subject"
        ),

        "command_job_number": docket_data.get(
            "command_job_no"
        ),

        "plant_name": docket_data.get(
            "plant_name"
        ),

        "plant_number": docket_data.get(
            "plant_no"
        ),

        "customer_number": docket_data.get(
            "customer_no"
        ),

        "customer_name": docket_data.get(
            "customer_name"
        ),

        "delivery_address": docket_data.get(
            "delivery_address"
        ),

        "purchase_order": docket_data.get(
            "purchase_order"
        ),

        "driver_name": docket_data.get(
            "driver_name"
        ),

        "time_dispatched": time_dispatched,

        "time_batched": time_batched,

        "arrive_jobsite": arrive_jobsite,

        "time_finished": time_finished,

        "total_time_on_site": total_time_on_site,

        "waiting_time": waiting_time,

        "truck_id": truck_id,

        "pdf_path": pdf_path,

        "source_email": email_data.get(
            "from"
        ),

        "source_email_subject": email_data.get(
            "subject"
        )
    }

    docket = {
        key: value
        for key, value in docket.items()
        if value is not None
    }

    try:

        response = (
            supabase
            .table("dockets")
            .insert(docket)
            .execute()
        )

        if not response.data:

            raise RuntimeError(
                "Supabase returned no docket data "
                "after insert."
            )

        docket_id = response.data[0]["id"]

        logging.info(
            f"Inserted docket "
            f"{docket_data.get('docket_no')} "
            f"({docket_id})"
        )

        return docket_id

    except Exception as e:

        logging.error(
            f"Failed to insert docket "
            f"{docket_data.get('docket_no')}: {e}"
        )

        raise


# ============================================================
# INSERT DOCKET LOAD
# ============================================================

def insert_docket_load(
    supabase,
    docket_id,
    docket_data
):

    docket_type = docket_data.get(
        "docket_type"
    )

    if docket_type == "aggregates":

        load = {

            "docket_id": docket_id,

            "product": docket_data.get(
                "product"
            ),

            "material_code": docket_data.get(
                "material_code"
            ),

            "quantity": docket_data.get(
                "net_weight"
            ),

            "unit": "tonnes",

            "gross_weight": docket_data.get(
                "gross_weight"
            ),

            "tare_weight": docket_data.get(
                "tare_weight"
            ),

            "net_weight": docket_data.get(
                "net_weight"
            )
        }

    elif docket_type == "concrete":

        load = {

            "docket_id": docket_id,

            "product": docket_data.get(
                "mix_description"
            ),

            "material_code": docket_data.get(
                "material_code"
            ),

            "quantity": docket_data.get(
                "this_load_m3"
            ),

            "unit": "m3"
        }

    else:

        logging.warning(
            f"Unknown docket type: {docket_type}"
        )

        return None

    load = {
        key: value
        for key, value in load.items()
        if value is not None
    }

    try:

        response = (
            supabase
            .table("docket_loads")
            .insert(load)
            .execute()
        )

        if response.data:

            load_id = response.data[0]["id"]

            logging.info(
                f"Inserted docket load "
                f"{load_id}"
            )

            return load_id

        return None

    except Exception as e:

        logging.error(
            f"Failed to insert docket load: {e}"
        )

        raise


# ============================================================
# PROCESS PDF ATTACHMENTS
# ============================================================

def process_pdf_attachments(
    msg,
    supabase
):

    attachments = []

    for part in msg.walk():

        filename = part.get_filename()

        if not filename:
            continue

        filename = decode_email_header(
            filename
        )

        if not filename.lower().endswith(".pdf"):
            continue

        logging.info(
            f"Found PDF attachment: {filename}"
        )

        # ----------------------------------------------------
        # Read PDF directly into memory
        # ----------------------------------------------------

        payload = part.get_payload(
            decode=True
        )

        if not payload:

            logging.warning(
                f"Could not read PDF attachment: "
                f"{filename}"
            )

            continue

        # ----------------------------------------------------
        # Parse PDF
        # ----------------------------------------------------

        docket_data = parse_docket_pdf(
            payload
        )

        if not docket_data:

            logging.warning(
                f"Could not parse PDF: {filename}"
            )

            continue

        docket_type = docket_data.get(
            "docket_type"
        )

        docket_number = docket_data.get(
            "docket_no"
        )

        # ----------------------------------------------------
        # Unknown docket
        # ----------------------------------------------------

        if docket_type == "unknown":

            logging.warning(
                f"Unknown docket type for {filename}"
            )

            attachments.append({

                "filename": filename,

                "docket_data": docket_data,

                "status": "unknown_docket_type"

            })

            continue

        # ----------------------------------------------------
        # Validate docket number
        # ----------------------------------------------------

        if not docket_number:

            logging.warning(
                f"No docket number found in {filename}"
            )

            attachments.append({

                "filename": filename,

                "docket_data": docket_data,

                "status": "missing_docket_number"

            })

            continue

        # ----------------------------------------------------
        # Check whether docket already exists
        # ----------------------------------------------------

        existing_docket = get_existing_docket(
            supabase,
            docket_data
        )

        if existing_docket:

            logging.info(
                f"Docket {docket_number} "
                f"already exists. Skipping."
            )

            attachments.append({

                "filename": filename,

                "docket_data": docket_data,

                "status": "already_exists",

                "docket_id": existing_docket["id"],

                "pdf_path": existing_docket.get(
                    "pdf_path"
                )

            })

            continue

        # ----------------------------------------------------
        # Upload PDF + insert docket/load
        # ----------------------------------------------------

        pdf_path = None

        try:

            # ------------------------------------------------
            # Upload PDF
            # ------------------------------------------------

            pdf_path = upload_pdf_to_supabase(
                supabase,
                payload,
                filename,
                docket_number,
                docket_type
            )

            # ------------------------------------------------
            # Email information
            # ------------------------------------------------

            email_data = {

                "from": msg.get(
                    "From"
                ),

                "subject": decode_email_header(
                    msg.get("Subject")
                )

            }

            # ------------------------------------------------
            # Insert docket
            # ------------------------------------------------

            docket_id = insert_docket(
                supabase,
                docket_data,
                email_data,
                pdf_path
            )

            # ------------------------------------------------
            # Insert load
            # ------------------------------------------------

            load_id = insert_docket_load(
                supabase,
                docket_id,
                docket_data
            )

            attachments.append({

                "filename": filename,

                "docket_data": docket_data,

                "status": "imported",

                "docket_id": docket_id,

                "load_id": load_id,

                "pdf_path": pdf_path

            })

            logging.info(
                f"Successfully imported docket "
                f"{docket_number}"
            )

        except Exception as e:

            logging.error(
                f"Failed to import docket "
                f"{docket_number}: {e}"
            )

            attachments.append({

                "filename": filename,

                "docket_data": docket_data,

                "status": "failed",

                "pdf_path": pdf_path,

                "error": str(e)

            })

    return attachments


# ============================================================
# GET DOCKET EMAILS
# ============================================================

def get_docket_emails(
    mail,
    file_path,
    days,
    supabase
):

    try:

        with open(
            file_path,
            "r",
            encoding="utf-8"
        ) as file:

            data = json.load(file)

            emails_to_check = data["emails"]

    except Exception as e:

        logging.error(
            f"Failed to load emails file: {e}"
        )

        raise

    # --------------------------------------------------------
    # Calculate search date
    # --------------------------------------------------------

    start_date = (
        datetime.now()
        - timedelta(days=days)
    )

    start_date = start_date.strftime(
        "%d-%b-%Y"
    )

    logging.info(
        f"Searching emails since {start_date}"
    )

    results = {}

    # --------------------------------------------------------
    # Search each sender
    # --------------------------------------------------------

    for sender in emails_to_check:

        try:

            logging.info(
                f"Searching emails from {sender}"
            )

            status, messages = mail.search(
                None,
                f'FROM "{sender}" SINCE {start_date}'
            )

            if status != "OK":

                logging.error(
                    f"Failed to search emails "
                    f"from {sender}"
                )

                continue

            email_ids = messages[0].split()

            logging.info(
                f"Found {len(email_ids)} emails "
                f"from {sender}"
            )

            results[sender] = []

            # ------------------------------------------------
            # Process emails
            # ------------------------------------------------

            for email_id in email_ids:

                status, data = mail.fetch(
                    email_id,
                    "(RFC822)"
                )

                if status != "OK":
                    continue

                raw_email = data[0][1]

                msg = email.message_from_bytes(
                    raw_email
                )

                subject = decode_email_header(
                    msg.get("Subject")
                )

                logging.info(
                    f"Processing email: {subject}"
                )

                # ------------------------------------------------
                # Process PDFs
                # ------------------------------------------------

                attachments = process_pdf_attachments(
                    msg,
                    supabase
                )

                # ------------------------------------------------
                # Store processing log
                # ------------------------------------------------

                results[sender].append({

                    "from": msg.get(
                        "From"
                    ),

                    "to": msg.get(
                        "To"
                    ),

                    "subject": subject,

                    "date": msg.get(
                        "Date"
                    ),

                    "body": get_email_body(
                        msg
                    ),

                    "attachments": attachments

                })

        except Exception as e:

            logging.error(
                f"Failed to retrieve emails "
                f"from {sender}: {e}"
            )

    return results


# ============================================================
# SAVE JSON PROCESSING LOG
# ============================================================

def save_json_output(
    data,
    filepath
):

    try:

        directory = os.path.dirname(
            filepath
        )

        if directory:

            os.makedirs(
                directory,
                exist_ok=True
            )

        with open(
            filepath,
            "w",
            encoding="utf-8"
        ) as file:

            json.dump(
                data,
                file,
                indent=4,
                ensure_ascii=False
            )

        logging.info(
            f"Processing log saved to {filepath}"
        )

    except Exception as e:

        logging.error(
            f"Failed to save JSON output: {e}"
        )


# ============================================================
# MAIN
# ============================================================

def main():

    logging.info(
        "=========================================="
    )

    logging.info(
        "Starting docket import"
    )

    logging.info(
        "=========================================="
    )

    # --------------------------------------------------------
    # 1. Load credentials
    # --------------------------------------------------------

    logging.info(
        "1. Loading credentials"
    )

    credentials = load_credentials(
        CREDENTIALS_FILE
    )

    # --------------------------------------------------------
    # 2. Connect to Gmail
    # --------------------------------------------------------

    logging.info(
        "2. Connecting to Gmail"
    )

    mail = connect_to_gmail_imap(
        credentials["user"],
        credentials["password"]
    )

    # --------------------------------------------------------
    # 3. Connect to Supabase
    # --------------------------------------------------------

    logging.info(
        "3. Connecting to Supabase"
    )

    supabase = connect_to_supabase(
        credentials
    )

    # --------------------------------------------------------
    # 4. Retrieve and process emails
    # --------------------------------------------------------

    logging.info(
        "4. Processing docket emails"
    )

    docket_emails = get_docket_emails(
        mail,
        EMAILS_FILE,
        DAYS_TO_SEARCH,
        supabase
    )

    # --------------------------------------------------------
    # 5. Save processing log
    # --------------------------------------------------------

    logging.info(
        "5. Saving processing log"
    )

    save_json_output(
        docket_emails,
        OUTPUT_FILE
    )

    # --------------------------------------------------------
    # 6. Close Gmail
    # --------------------------------------------------------

    logging.info(
        "6. Closing Gmail connection"
    )

    try:
        mail.close()
    except Exception:
        pass

    try:
        mail.logout()
    except Exception:
        pass

    logging.info(
        "=========================================="
    )

    logging.info(
        "Docket import finished successfully"
    )

    logging.info(
        "==========================================")


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    main()