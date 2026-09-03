import yaml
import logging
import imaplib
import pandas as pd
import json
import email
import os
import re

from io import BytesIO
from datetime import datetime, timedelta
from pypdf import PdfReader


# ============================================================
# SETTINGS
# ============================================================

DAYS_TO_SEARCH = 1

EMAILS_FILE = "Email Scraper/emails.json"

PDF_FOLDER = "Email Scraper/pdfs"

OUTPUT_FILE = "Email Scraper/docket_emails.json"

CREDENTIALS_FILE = "Email Scraper/credentials.yaml"


# ============================================================
# LOAD CREDENTIALS
# ============================================================

def load_credentials(filepath):

    try:

        with open(filepath, 'r') as file:

            credentials = yaml.safe_load(file)

            user = credentials['user']
            password = credentials['password']

            return user, password

    except Exception as e:

        logging.error(
            "Failed to load credentials: {}".format(e)
        )

        raise


# ============================================================
# CONNECT TO GMAIL
# ============================================================

def connect_to_gmail_imap(user, password):

    imap_url = 'imap.gmail.com'

    try:

        mail = imaplib.IMAP4_SSL(imap_url)

        mail.login(user, password)

        mail.select('INBOX')

        return mail

    except Exception as e:

        logging.error(
            "Connection failed: {}".format(e)
        )

        raise


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
# CLEAN PDF TEXT
# ============================================================

def clean_pdf_text(text):

    # Normalize line endings
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    # Remove excessive whitespace
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

    label = label.lower()

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
# EXTRACT NUMBER
# ============================================================

def extract_number(value):

    if value is None:

        return None

    match = re.search(
        r"-?\d+(?:\.\d+)?",
        value.replace(",", "")
    )

    if match:

        number = match.group()

        if "." in number:

            return float(number)

        return int(number)

    return None


# ============================================================
# PARSE CONCRETE DOCKET
# ============================================================

def parse_concrete_docket(lines):

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

        "arrive_jobsite": get_value_after_label(
            lines,
            "Arrive Jobsite"
        ),

        "time_finished": get_value_after_label(
            lines,
            "Time Finished"
        ),

        "total_time_on_site": get_value_after_label(
            lines,
            "Total Time on Site (HH:MM)"
        ),

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
            get_value_after_label(
                lines,
                "Net Weight"
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

        "material_code": get_value_after_label(
            lines,
            "Material Code"
        ),

        "product": get_value_after_label(
            lines,
            "Product"
        ),

        "arrive_jobsite": get_value_after_label(
            lines,
            "Arrive Jobsite"
        ),

        "time_finished": get_value_after_label(
            lines,
            "Time Finished"
        ),

        "total_time_on_site": get_value_after_label(
            lines,
            "Total Time on Site (HH:MM)"
        )

    }

    return docket


# ============================================================
# PARSE DOCKET PDF
# ============================================================

def parse_docket_pdf(pdf_data):

    text = extract_pdf_text(pdf_data)

    if not text:

        logging.warning(
            "No text could be extracted from PDF"
        )

        return None

    lines = clean_pdf_text(text)

    # Determine docket type
    if any(
        "Raw Materials" in line
        for line in lines
    ):

        return parse_aggregates_docket(lines)

    elif any(
        "Concrete" in line
        for line in lines
    ):

        return parse_concrete_docket(lines)

    else:

        logging.warning(
            "Could not determine docket type"
        )

        return {

            "docket_type": "unknown",

            "raw_text": text

        }


# ============================================================
# SAVE PDF ATTACHMENTS
# ============================================================

def save_pdf_attachments(msg, output_folder):

    os.makedirs(
        output_folder,
        exist_ok=True
    )

    attachments = []

    for part in msg.walk():

        content_disposition = part.get(
            "Content-Disposition"
        )

        filename = part.get_filename()

        if not filename:

            continue

        if filename.lower().endswith(".pdf"):

            payload = part.get_payload(
                decode=True
            )

            if not payload:

                continue

            # Make filename safe
            filename = os.path.basename(
                filename
            )

            filepath = os.path.join(
                output_folder,
                filename
            )

            # Avoid overwriting an existing PDF
            if os.path.exists(filepath):

                base, extension = os.path.splitext(
                    filename
                )

                counter = 1

                while os.path.exists(filepath):

                    new_filename = (
                        f"{base}_{counter}{extension}"
                    )

                    filepath = os.path.join(
                        output_folder,
                        new_filename
                    )

                    counter += 1

            # Save PDF
            with open(
                filepath,
                "wb"
            ) as file:

                file.write(payload)

            # Parse PDF
            docket_data = parse_docket_pdf(
                payload
            )

            attachments.append({

                "filename": os.path.basename(
                    filepath
                ),

                "filepath": filepath,

                "docket_data": docket_data

            })

    return attachments


# ============================================================
# GET DOCKET EMAILS
# ============================================================

def get_docket_emails(
    mail,
    file_path,
    days
):

    try:

        with open(
            file_path,
            "r"
        ) as file:

            data = json.load(file)

            emails_to_check = data["emails"]

    except Exception as e:

        logging.error(
            "Failed to load emails: {}".format(e)
        )

        raise

    # Calculate search date
    start_date = (
        datetime.now()
        - timedelta(days=days)
    )

    start_date = start_date.strftime(
        "%d-%b-%Y"
    )

    print(
        f"Searching emails since {start_date}"
    )

    results = {}

    for sender in emails_to_check:

        try:

            print(
                f"Searching {sender}..."
            )

            status, messages = mail.search(
                None,
                f'FROM "{sender}" SINCE {start_date}'
            )

            if status != "OK":

                logging.error(
                    f"Failed to search emails from {sender}"
                )

                continue

            email_ids = messages[0].split()

            print(
                f"Found {len(email_ids)} emails from {sender}"
            )

            results[sender] = []

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

                print(
                    f"Processing: {msg['Subject']}"
                )

                # Get PDF attachments
                attachments = save_pdf_attachments(
                    msg,
                    PDF_FOLDER
                )

                results[sender].append({

                    "from": msg["From"],

                    "to": msg["To"],

                    "subject": msg["Subject"],

                    "date": msg["Date"],

                    "body": get_email_body(msg),

                    "attachments": attachments

                })

        except Exception as e:

            logging.error(
                f"Failed to retrieve emails from {sender}: {e}"
            )

    return results


# ============================================================
# MAIN
# ============================================================

def main():

    print("Running main...")

    # Create PDF folder
    os.makedirs(
        PDF_FOLDER,
        exist_ok=True
    )

    print("1. Loading credentials")

    credentials = load_credentials(
        CREDENTIALS_FILE
    )

    print("2. Credentials loaded")

    mail = connect_to_gmail_imap(
        *credentials
    )

    print("3. Connected to Gmail")

    docket_emails = get_docket_emails(
        mail,
        EMAILS_FILE,
        DAYS_TO_SEARCH
    )

    print("4. Emails retrieved")

    # Save everything to JSON
    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            docket_emails,
            file,
            indent=4,
            ensure_ascii=False
        )

    print(
        f"5. Data saved to {OUTPUT_FILE}"
    )

    mail.close()

    mail.logout()

    print("6. Finished")


if __name__ == "__main__":

    main()