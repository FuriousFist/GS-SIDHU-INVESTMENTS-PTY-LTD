"""Unit tests for the small, pure text/number/date helpers.

These have no I/O, so they're the cheapest, highest-value tests in the
suite: fast, deterministic, and they pin down the edge cases the parsers
above them depend on (odd whitespace, AU date formats, 24h vs 12h clocks).
"""

import pytest

import email_scraper_main as m


# ------------------------------------------------------------------
# decode_email_header
# ------------------------------------------------------------------

class TestDecodeEmailHeader:

    def test_plain_ascii(self):
        assert m.decode_email_header("Hello World") == "Hello World"

    def test_empty_or_none(self):
        assert m.decode_email_header("") == ""
        assert m.decode_email_header(None) == ""

    def test_encoded_word(self):
        # RFC 2047 encoded-word, as Gmail sends for non-ASCII subjects.
        assert m.decode_email_header("=?utf-8?q?Caf=C3=A9?=") == "Café"


# ------------------------------------------------------------------
# clean_pdf_text
# ------------------------------------------------------------------

class TestCleanPdfText:

    def test_strips_blank_lines_and_whitespace(self):
        text = "  Date  \n\n02-Sep-26\r\n\r\n  Docket No.  \n123\n"
        assert m.clean_pdf_text(text) == [
            "Date",
            "02-Sep-26",
            "Docket No.",
            "123",
        ]

    def test_empty_text(self):
        assert m.clean_pdf_text("") == []


# ------------------------------------------------------------------
# extract_number
# ------------------------------------------------------------------

class TestExtractNumber:

    @pytest.mark.parametrize(
        "value, expected",
        [
            ("30.24", 30.24),
            ("30.24 tonnes", 30.24),
            ("1,234", 1234),
            ("-5", -5),
            ("no digits here", None),
            (None, None),
            ("", None),
            (42, 42),
        ],
    )
    def test_extract_number(self, value, expected):
        assert m.extract_number(value) == expected


# ------------------------------------------------------------------
# normalize_date
# ------------------------------------------------------------------

class TestNormalizeDate:

    @pytest.mark.parametrize(
        "value, expected",
        [
            ("02/09/2026", "2026-09-02"),
            ("02-09-2026", "2026-09-02"),
            ("02/09/26", "2026-09-02"),
            ("02-09-26", "2026-09-02"),
            ("2026-09-02", "2026-09-02"),
            ("02-Sep-2026", "2026-09-02"),
            ("02-Sep-26", "2026-09-02"),
            ("02 Sep 2026", "2026-09-02"),
        ],
    )
    def test_recognised_formats(self, value, expected):
        assert m.normalize_date(value) == expected

    def test_unrecognised_format_logs_and_returns_none(self):
        assert m.normalize_date("not a date") is None

    def test_blank_returns_none(self):
        assert m.normalize_date("") is None
        assert m.normalize_date(None) is None


# ------------------------------------------------------------------
# normalize_time
# ------------------------------------------------------------------

class TestNormalizeTime:

    @pytest.mark.parametrize(
        "value, expected",
        [
            ("08:12", "08:12:00"),
            ("08:12:30", "08:12:30"),
            ("8:12 AM", "08:12:00"),
            ("8:12:30 PM", "20:12:30"),
        ],
    )
    def test_recognised_formats(self, value, expected):
        assert m.normalize_time(value) == expected

    def test_unrecognised_format_returns_none(self):
        assert m.normalize_time("not a time") is None

    def test_blank_returns_none(self):
        assert m.normalize_time("") is None
        assert m.normalize_time(None) is None


# ------------------------------------------------------------------
# combine_date_time
# ------------------------------------------------------------------

class TestCombineDateTime:

    def test_combines_valid_date_and_time(self):
        assert (
            m.combine_date_time("02-Sep-26", "08:12")
            == "2026-09-02T08:12:00"
        )

    def test_missing_date_returns_none(self):
        assert m.combine_date_time(None, "08:12") is None

    def test_missing_time_returns_none(self):
        assert m.combine_date_time("02-Sep-26", None) is None

    def test_unparseable_date_returns_none(self):
        assert m.combine_date_time("garbage", "08:12") is None


# ------------------------------------------------------------------
# time_diff_hms
# ------------------------------------------------------------------

class TestTimeDiffHms:

    def test_same_day_duration(self):
        assert m.time_diff_hms("07:38", "08:15") == "0:37:0"

    def test_multi_hour_duration(self):
        assert m.time_diff_hms("08:12", "10:19") == "2:7:0"

    def test_end_before_start_returns_none(self):
        # No overnight-wrap support - dockets are same-day.
        assert m.time_diff_hms("10:00", "09:00") is None

    def test_missing_values_return_none(self):
        assert m.time_diff_hms(None, "08:15") is None
        assert m.time_diff_hms("07:38", None) is None


# ------------------------------------------------------------------
# normalize_interval
# ------------------------------------------------------------------

class TestNormalizeInterval:

    @pytest.mark.parametrize(
        "value, expected",
        [
            ("0:37:0", "00:37:00"),
            ("2:7:0", "02:07:00"),
            ("0:13:0", "00:13:00"),
            ("12:30", "12:30:00"),
        ],
    )
    def test_pads_to_two_digit_hms(self, value, expected):
        assert m.normalize_interval(value) == expected

    def test_blank_returns_none(self):
        assert m.normalize_interval("") is None
        assert m.normalize_interval(None) is None

    def test_unparseable_returns_none(self):
        assert m.normalize_interval("garbage") is None
