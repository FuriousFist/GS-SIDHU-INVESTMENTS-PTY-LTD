"""Generator for the synthetic docket PDF test fixtures in this directory.

These fixtures stand in for real docket PDFs (which are gitignored -
Email Scraper/pdfs/ holds real customer data) so the full pypdf/pdftotext
extraction pipeline still gets exercised in CI, with fabricated data only.

Not part of the test suite or a runtime dependency - only needed here,
at generation time:

    pip install reportlab
    python3 "Email Scraper/tests/fixtures/generate_fixtures.py"

Re-run it after changing the fixture data below, or if a parser change
means the fixtures need new/different fields to stay meaningful.
"""

from pathlib import Path

from reportlab.pdfgen import canvas


def simple_docket_pdf(path, lines, font="Helvetica", font_size=10):
    """label/value-per-line docket (Aggregates, Holcim concrete) - plain
    top-to-bottom text, order-of-drawing is what pypdf's extract_text()
    reads back."""

    pagesize = (612, 792)  # US letter, points
    c = canvas.Canvas(str(path), pagesize=pagesize)
    c.setFont(font, font_size)

    width, height = pagesize
    x = 50
    y = height - 50
    line_height = 14

    for line in lines:
        c.drawString(x, y, line)
        y -= line_height

    c.showPage()
    c.save()


def barro_style_pdf(path, rows, font_size=8):
    """Column-positioned docket (Barro) - each row is a list of
    (col_index, text) pairs drawn at x = col_index * char_width using a
    monospaced font, so pdftotext -layout reconstructs the same
    character columns."""

    pagesize = (1000, 700)
    c = canvas.Canvas(str(path), pagesize=pagesize)
    c.setFont("Courier", font_size)
    char_width = c.stringWidth(" ", "Courier", font_size)

    width, height = pagesize
    left_margin = 40
    top_margin = 60
    line_height = 11

    y = height - top_margin

    for row in rows:
        for col_index, text in row:
            c.drawString(left_margin + col_index * char_width, y, text)
        y -= line_height

    c.showPage()
    c.save()


if __name__ == "__main__":
    out_dir = Path(__file__).resolve().parent

    # ----------------------------------------------------------------
    # Aggregates fixture
    # ----------------------------------------------------------------

    simple_docket_pdf(
        out_dir / "fixture_aggregates.pdf",
        [
            "Raw Materials",
            "Delivery Docket",
            "TAX INVOICE",
            "Fake Aggregates Co Pty Ltd",
            "Date",
            "03-Sep-26",
            "Command Job No.",
            "TEST000000001",
            "Plant Name",
            "Testfield",
            "Plant No.",
            "9001",
            "Docket No.",
            "90010001",
            "Customer No.",
            "1234",
            "Customer Name",
            "FAKE TEST CUSTOMER PTY LTD",
            "Time Dispatched",
            "05:00",
            "Delivery Address & Instructions",
            "1 TEST STREET TESTVILLE",
            "Customer Purchase Order No.",
            "PO-TEST-0001",
            "Total Weight",
            "50.00",
            "Gross Weight",
            "49.44",
            "Tare Weight",
            "19.20",
            "This load/NetWeight",
            "30.24",
            "Truck No.",
            "9099",
            "Vehicle Reg",
            "TEST001",
            "Fleet No.",
            "F9099",
            "Kms",
            "12",
            "Primary Material Code",
            "TESTMAT10",
            "Product Description",
            "10mm TEST AGGREGATE",
            "Arrive Jobsite 05:25 Batch + Moisture",
            "Time Finished 05:38",
            "Total Time on",
            "Site (HH:MM)",
            "0:13:0",
        ],
    )

    # ----------------------------------------------------------------
    # Holcim concrete fixture
    # ----------------------------------------------------------------

    simple_docket_pdf(
        out_dir / "fixture_holcim_concrete.pdf",
        [
            "Concrete",
            "Delivery Docket",
            "TAX INVOICE",
            "Fake Concrete Co Pty Ltd",
            "Date",
            "03-09-26",
            "Command Job No.",
            "39",
            "Plant Name",
            "TESTFIELD",
            "Plant No.",
            "9002",
            "Docket No.",
            "90020001",
            "Customer No.",
            "5678",
            "Customer Name",
            "FAKE TEST CUSTOMER TWO",
            "Time Printed",
            "07:05",
            "Time Batched",
            "07:27",
            "Delivery Address & Instructions",
            "2 TEST AVENUE TESTVILLE",
            "Total Order M3",
            "49.0",
            "Progressive M3",
            "28.0",
            "This Load M3",
            "7.0",
            "Truck No.",
            "9199",
            "Klm / Zone / Map Ref",
            "13 TESTMAP",
            "Design Slump",
            "200",
            "Material Code / Strength MPa",
            "TESTMIX01",
            "Mix Description",
            "S40 TEST MIX DESCRIPTION",
            "Arrive Jobsite",
            "Time Finished",
            "Total Time on",
            "Site (HH:MM)",
            "08:12",
            "10:19",
            "2:7:0",
            "Batch + Moisture",
            "5",
            "Slump Stand",
            "180",
            "Quantity Returned",
            "0",
            "Max. Water",
            "10",
            "Lat-Long :",
            "-37.000000,145.000000",
        ],
    )

    # ----------------------------------------------------------------
    # Barro concrete fixture
    # ----------------------------------------------------------------

    barro_style_pdf(
        out_dir / "fixture_barro_concrete.pdf",
        [
            [(0, "TESTFIELD PLANT")],
            [(0, "BARRO GROUP")],
            [(0, "PRONTO CONCRETE")],
            [],
            [
                (0, "JOB NO."),
                (21, "ACCOUNT NO."),
                (44, "CUSTOMER"),
                (113, "DATE"),
            ],
            [],
            [
                (0, "42"),
                (21, "90210"),
                (44, "FAKE CUSTOMER PTY LTD"),
                (115, "03/09/26"),
                (147, "99999001"),
            ],
            [(0, "QUOTE NO."), (44, "DELIVERY ADDRESS")],
            [],
            [(0, "12345"), (44, "1 FAKE STREET FAKETOWN")],
            [],
            [
                (0, "ORDER NO."),
                (44, "MIX"),
                (73, "TYPE"),
                (110, "TIME OUT"),
                (124, "TIME ARRIVED"),
                (137, "START POUR"),
                (150, "FINISH POUR"),
            ],
            [
                (47, "N20 10mm Test Mix"),
                (109, "06:00"),
                (122, "06:30"),
                (135, "06:35"),
                (149, "07:10"),
            ],
            [],
            [
                (44, "CHARACTERISTIC"),
                (117, "WAITING TIME 9 mins"),
                (154, "ENVIRO DISPOSAL FEE"),
            ],
            [(0, "MAP REFERENCE"), (22, "ZONE"), (44, "STRENGTH")],
            [],
            [(0, "TRUCK NO."), (21, "DRIVER NO.")],
            [(113, "OFFICE USE")],
            [(0, "999"), (21, "111"), (44, "SLUMP")],
            [],
            [
                (22, "Oz"),
                (44, "5.40"),
                (65, "M3"),
                (85, "40.00"),
                (105, "M3"),
                (149, "CONDITIONS"),
            ],
        ],
    )

    print("wrote fixtures to", out_dir)
