"""Unit tests for the line-scanning helpers the docket parsers are built
from: label/value lookups, and the fixed-width column slicing pdftotext
-layout output needs for the Barro parser.
"""

import email_scraper_main as m


# ------------------------------------------------------------------
# get_value_after_label
# ------------------------------------------------------------------

class TestGetValueAfterLabel:

    def test_finds_value_on_next_line(self):
        lines = ["Date", "02-Sep-26", "Docket No.", "12103492"]
        assert m.get_value_after_label(lines, "Date") == "02-Sep-26"
        assert m.get_value_after_label(lines, "Docket No.") == "12103492"

    def test_case_insensitive_match(self):
        lines = ["DATE", "02-Sep-26"]
        assert m.get_value_after_label(lines, "date") == "02-Sep-26"

    def test_missing_label_returns_none(self):
        lines = ["Date", "02-Sep-26"]
        assert m.get_value_after_label(lines, "Truck No.") is None

    def test_label_on_last_line_returns_none(self):
        lines = ["Date", "02-Sep-26", "Docket No."]
        assert m.get_value_after_label(lines, "Docket No.") is None


# ------------------------------------------------------------------
# get_value_same_line
# ------------------------------------------------------------------

class TestGetValueSameLine:

    def test_finds_inline_value(self):
        lines = ["Truck No. 4309", "Other line"]
        assert m.get_value_same_line(lines, "Truck No.") == "4309"

    def test_missing_label_returns_none(self):
        lines = ["Truck No. 4309"]
        assert m.get_value_same_line(lines, "Docket No.") is None

    def test_label_with_no_trailing_value_returns_none(self):
        lines = ["Truck No.   "]
        assert m.get_value_same_line(lines, "Truck No.") is None


# ------------------------------------------------------------------
# get_net_weight
# ------------------------------------------------------------------

class TestGetNetWeight:

    def test_finds_value_after_split_netweight_label(self):
        # Aggregates dockets print the label split across two lines with
        # no space: "This" / "load/NetWeight" - the value follows.
        lines = ["This", "load/NetWeight", "30.24"]
        assert m.get_net_weight(lines) == "30.24"

    def test_pricing_section_variant(self):
        lines = ["This load", "/NetWeight", "30.24"]
        assert m.get_net_weight(lines) == "30.24"

    def test_no_match_returns_none(self):
        assert m.get_net_weight(["Gross Weight", "49.44"]) is None


# ------------------------------------------------------------------
# get_time_on_site_fields
#
# Per the docstring on the function under test, dockets print this
# section in one of two layouts, and both need to resolve to the same
# result.
# ------------------------------------------------------------------

class TestGetTimeOnSiteFields:

    def test_inline_layout(self):
        lines = [
            "Arrive Jobsite 08:12 Batch + Moisture",
            "Time Finished 10:19",
            "Total Time on",
            "Site (HH:MM)",
            "2:7:0",
        ]

        result = m.get_time_on_site_fields(lines)

        assert result == {
            "arrive_jobsite": "08:12",
            "time_finished": "10:19",
            "total_time_on_site": "2:7:0",
        }

    def test_block_layout(self):
        lines = [
            "Arrive Jobsite",
            "Time Finished",
            "Total Time on",
            "Site (HH:MM)",
            "08:14",
            "08:22",
            "0:8:0",
        ]

        result = m.get_time_on_site_fields(lines)

        assert result == {
            "arrive_jobsite": "08:14",
            "time_finished": "08:22",
            "total_time_on_site": "0:8:0",
        }

    def test_missing_section_returns_all_none(self):
        result = m.get_time_on_site_fields(["Docket No.", "12345"])

        assert result == {
            "arrive_jobsite": None,
            "time_finished": None,
            "total_time_on_site": None,
        }


# ------------------------------------------------------------------
# slice_by_header
# ------------------------------------------------------------------

class TestSliceByHeader:

    def test_slices_value_row_at_header_offsets(self):
        header = "JOB NO.        ACCOUNT NO.     CUSTOMER"
        value = "99              22105           ARK INDUSTRIAL PTY LTD"

        result = m.slice_by_header(
            header, value, ["JOB NO.", "ACCOUNT NO.", "CUSTOMER"]
        )

        assert result["JOB NO."] == "99"
        assert result["ACCOUNT NO."] == "22105"
        assert result["CUSTOMER"] == "ARK INDUSTRIAL PTY LTD"

    def test_missing_label_in_header_returns_none(self):
        header = "JOB NO.        ACCOUNT NO."
        value = "99              22105"

        assert m.slice_by_header(header, value, ["JOB NO.", "CUSTOMER"]) is None

    def test_value_row_shorter_than_header_gives_empty_string(self):
        header = "JOB NO.        ACCOUNT NO.     CUSTOMER"
        value = "99"

        result = m.slice_by_header(
            header, value, ["JOB NO.", "ACCOUNT NO.", "CUSTOMER"]
        )

        assert result["JOB NO."] == "99"
        assert result["ACCOUNT NO."] == ""
        assert result["CUSTOMER"] == ""


# ------------------------------------------------------------------
# find_header_and_value / find_header_and_aligned_value
# ------------------------------------------------------------------

class TestFindHeaderAndValue:

    def test_finds_header_and_next_nonblank_line(self):
        lines = ["JOB NO.  ACCOUNT NO.", "", "99       22105"]

        header, value, idx = m.find_header_and_value(lines, "JOB NO.")

        assert header == "JOB NO.  ACCOUNT NO."
        assert value == "99       22105"
        assert idx == 2

    def test_missing_header_returns_none_triple(self):
        assert m.find_header_and_value(["a", "b"], "JOB NO.") == (
            None,
            None,
            None,
        )


class TestFindHeaderAndAlignedValue:

    def test_skips_line_with_no_content_at_header_column(self):
        # Header "TRUCK NO." starts at column 0. The first candidate
        # line below it is blank at column 0 (stray text from another
        # column), so it should be skipped in favour of the real value.
        lines = [
            "TRUCK NO.  DRIVER NO.",
            "           801",  # blank under TRUCK NO.'s column
            "712        801",
        ]

        header, value, idx = m.find_header_and_aligned_value(
            lines, "TRUCK NO."
        )

        assert value == "712        801"
        assert idx == 2

    def test_missing_header_returns_none_triple(self):
        assert m.find_header_and_aligned_value(["a", "b"], "TRUCK NO.") == (
            None,
            None,
            None,
        )
