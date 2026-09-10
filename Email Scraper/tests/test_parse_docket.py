"""Parser tests.

Three layers:

1. Golden/regression tests against real sample PDFs from
   Email Scraper/pdfs/ - one per sender (AGGREGATES = Holcim aggregates,
   HOLCIM = Holcim concrete, ALL = Barro concrete). That directory holds
   real customer data and is gitignored, so these only run on machines
   that have it (they skip cleanly otherwise, e.g. in CI - see
   conftest.load_pdf).

2. The same golden tests again, but against the synthetic fixture PDFs
   committed under Email Scraper/tests/fixtures/ (fabricated data,
   regenerated via fixtures/generate_fixtures.py). These always run, so
   CI still gets full pypdf/pdftotext extraction-pipeline coverage even
   without the real samples.

3. Type-detection branch tests using monkeypatched PDF text, since the
   "unknown docket" and "Barro layout extraction failed" branches aren't
   exercised by any sample file, real or synthetic.
"""

import email_scraper_main as m


# ------------------------------------------------------------------
# Golden tests against real sample dockets (local-only, skip in CI)
# ------------------------------------------------------------------

class TestParseDocketPdfGolden:

    def test_aggregates_docket(self, load_pdf):
        result = m.parse_docket_pdf(load_pdf("AGGREGATES"))

        assert result["docket_type"] == "aggregates"
        assert result["docket_no"] == "12103492"
        assert result["plant_no"] == "5121"
        assert result["customer_no"] == "5180"
        assert result["truck_no"] == "5374"
        assert result["material_code"] == "QPET10"
        # This docket's PO field was left blank on the printed form -
        # regression check for a bug where the next field's label
        # ("Total Order") got captured as the value instead.
        assert result["purchase_order"] is None
        assert result["gross_weight"] == 49.44
        assert result["tare_weight"] == 19.2
        assert result["net_weight"] == 30.24
        assert result["arrive_jobsite"] == "05:25"
        assert result["time_finished"] == "05:38"
        assert result["total_time_on_site"] == "0:13:0"

    def test_holcim_concrete_docket(self, load_pdf):
        result = m.parse_docket_pdf(load_pdf("HOLCIM"))

        assert result["docket_type"] == "concrete"
        assert result["docket_no"] == "48851948"
        assert result["plant_no"] == "5488"
        assert result["truck_no"] == "4309"
        assert result["material_code"] == "VE402NHF5"
        assert result["this_load_m3"] == 7.0
        assert result["progressive_m3"] == 28.0
        assert result["arrive_jobsite"] == "08:12"
        assert result["time_finished"] == "10:19"
        assert result["total_time_on_site"] == "2:7:0"

    def test_barro_concrete_docket(self, load_pdf):
        result = m.parse_docket_pdf(load_pdf("ALL"))

        assert result["docket_type"] == "concrete"
        assert result["plant_name"] == "SUNSHINE"
        assert result["docket_no"] == "13156351"
        assert result["command_job_no"] == "99"
        assert result["customer_no"] == "22105"
        assert result["truck_no"] == "712"
        assert result["mix_description"] == "N32 14mm Pump"
        assert result["time_dispatched"] == "07:08"
        assert result["arrive_jobsite"] == "07:38"
        assert result["time_finished"] == "08:15"
        assert result["total_time_on_site"] == "0:37:0"
        assert result["this_load_m3"] == 7.2
        assert result["progressive_m3"] == 76.6


# ------------------------------------------------------------------
# Golden tests against committed synthetic fixtures (always run)
# ------------------------------------------------------------------

class TestParseDocketPdfGoldenFixtures:

    def test_aggregates_fixture(self, fixture_pdf):
        result = m.parse_docket_pdf(fixture_pdf("fixture_aggregates.pdf"))

        assert result["docket_type"] == "aggregates"
        assert result["docket_no"] == "90010001"
        assert result["plant_no"] == "9001"
        assert result["customer_name"] == "FAKE TEST CUSTOMER PTY LTD"
        assert result["truck_no"] == "9099"
        assert result["material_code"] == "TESTMAT10"
        assert result["purchase_order"] == "PO-TEST-0001"
        assert result["gross_weight"] == 49.44
        assert result["tare_weight"] == 19.2
        assert result["net_weight"] == 30.24
        assert result["arrive_jobsite"] == "05:25"
        assert result["time_finished"] == "05:38"
        assert result["total_time_on_site"] == "0:13:0"

    def test_holcim_concrete_fixture(self, fixture_pdf):
        result = m.parse_docket_pdf(
            fixture_pdf("fixture_holcim_concrete.pdf")
        )

        assert result["docket_type"] == "concrete"
        assert result["docket_no"] == "90020001"
        assert result["plant_no"] == "9002"
        assert result["truck_no"] == "9199"
        assert result["material_code"] == "TESTMIX01"
        assert result["this_load_m3"] == 7.0
        assert result["progressive_m3"] == 28.0
        assert result["arrive_jobsite"] == "08:12"
        assert result["time_finished"] == "10:19"
        assert result["total_time_on_site"] == "2:7:0"

    def test_barro_concrete_fixture(self, fixture_pdf):
        result = m.parse_docket_pdf(fixture_pdf("fixture_barro_concrete.pdf"))

        assert result["docket_type"] == "concrete"
        assert result["plant_name"] == "TESTFIELD"
        assert result["docket_no"] == "99999001"
        assert result["command_job_no"] == "42"
        assert result["customer_no"] == "90210"
        assert result["truck_no"] == "999"
        assert result["mix_description"] == "N20 10mm Test Mix"
        assert result["time_dispatched"] == "06:00"
        assert result["arrive_jobsite"] == "06:30"
        assert result["time_finished"] == "07:10"
        assert result["total_time_on_site"] == "0:40:0"
        assert result["this_load_m3"] == 5.4
        assert result["progressive_m3"] == 40.0


# ------------------------------------------------------------------
# Type-detection branches
# ------------------------------------------------------------------

class TestParseDocketPdfTypeDetection:

    def test_no_extractable_text_returns_none(self, monkeypatch):
        monkeypatch.setattr(m, "extract_pdf_text", lambda pdf_data: "")

        assert m.parse_docket_pdf(b"whatever") is None

    def test_unrecognised_layout_returns_unknown(self, monkeypatch):
        monkeypatch.setattr(
            m, "extract_pdf_text", lambda pdf_data: "Some Other Document\n"
        )

        result = m.parse_docket_pdf(b"whatever")

        assert result["docket_type"] == "unknown"
        assert "raw_text" in result

    def test_barro_layout_extraction_failure_returns_unknown(
        self, monkeypatch
    ):
        monkeypatch.setattr(
            m, "extract_pdf_text", lambda pdf_data: "BARRO GROUP\n"
        )
        monkeypatch.setattr(
            m, "extract_pdf_text_layout", lambda pdf_data, page=1: ""
        )

        result = m.parse_docket_pdf(b"whatever")

        assert result["docket_type"] == "unknown"

    def test_raw_materials_routes_to_aggregates_parser(self, monkeypatch):
        monkeypatch.setattr(
            m,
            "extract_pdf_text",
            lambda pdf_data: "Raw Materials\nDocket No.\n555\n",
        )

        result = m.parse_docket_pdf(b"whatever")

        assert result["docket_type"] == "aggregates"
        assert result["docket_no"] == "555"

    def test_concrete_routes_to_concrete_parser(self, monkeypatch):
        monkeypatch.setattr(
            m,
            "extract_pdf_text",
            lambda pdf_data: "Concrete\nDocket No.\n777\n",
        )

        result = m.parse_docket_pdf(b"whatever")

        assert result["docket_type"] == "concrete"
        assert result["docket_no"] == "777"


# ------------------------------------------------------------------
# parse_aggregates_docket / parse_concrete_docket directly
#
# Covers fields the golden PDFs above don't happen to exercise, without
# needing another real PDF fixture.
# ------------------------------------------------------------------

class TestParseAggregatesDocket:

    def test_blank_purchase_order_is_not_captured_as_next_label(self):
        # No value printed for "Customer Purchase Order No." - the next
        # line is really the start of the following field's label.
        lines = m.clean_pdf_text(
            "Customer Purchase Order No.\nTotal Order\nWeight\n30.24\n"
        )

        result = m.parse_aggregates_docket(lines)

        assert result["purchase_order"] is None

    def test_real_purchase_order_value_is_captured(self):
        lines = m.clean_pdf_text(
            "Customer Purchase Order No.\nPO-TEST-0001\n"
        )

        result = m.parse_aggregates_docket(lines)

        assert result["purchase_order"] == "PO-TEST-0001"

    def test_material_code_falls_back_to_secondary_label(self):
        lines = m.clean_pdf_text(
            "Material Code\nQPET10\n"
        )

        result = m.parse_aggregates_docket(lines)

        assert result["material_code"] == "QPET10"

    def test_product_falls_back_to_secondary_label(self):
        lines = m.clean_pdf_text(
            "Product\n10mm AGGREGATE\n"
        )

        result = m.parse_aggregates_docket(lines)

        assert result["product"] == "10mm AGGREGATE"


class TestParseConcreteDocket:

    def test_numeric_fields_are_extracted_as_numbers(self):
        lines = m.clean_pdf_text(
            "Total Order M3\n49.0\n"
            "This Load M3\n7.0\n"
            "Design Slump\n200\n"
        )

        result = m.parse_concrete_docket(lines)

        assert result["total_order_m3"] == 49.0
        assert result["this_load_m3"] == 7.0
        assert result["design_slump"] == 200
