"""Tests for the functions that talk to Supabase.

These mock the Supabase client's fluent query builder (`.table(...)
.select(...).eq(...).execute()`) rather than hitting a real project, so
they run offline and verify our code's behaviour - not Supabase's. Each
mock is built to only support the chain the function under test actually
calls; an unexpected call raises AttributeError, which is a useful signal
if the code under test changes shape.
"""

from unittest.mock import MagicMock

import pytest

import email_scraper_main as m


def make_query_mock(execute_return_data):
    """A MagicMock whose .table().select().eq()... chain returns itself
    at every step (so any chain length works) and whose terminal
    .execute() returns an object with a `.data` attribute."""

    query = MagicMock()
    query.table.return_value = query
    query.select.return_value = query
    query.eq.return_value = query
    query.limit.return_value = query
    query.update.return_value = query
    query.insert.return_value = query

    response = MagicMock()
    response.data = execute_return_data
    query.execute.return_value = response

    return query


# ------------------------------------------------------------------
# get_or_create_truck
# ------------------------------------------------------------------

class TestGetOrCreateTruck:

    def test_blank_truck_number_returns_none_without_querying(self):
        supabase = MagicMock()

        assert m.get_or_create_truck(supabase, None) is None
        assert m.get_or_create_truck(supabase, "   ") is None
        supabase.table.assert_not_called()

    def test_existing_truck_is_returned(self):
        supabase = make_query_mock(
            [{"id": "truck-1", "registration": "ABC123"}]
        )

        truck_id = m.get_or_create_truck(supabase, "4309", "ABC123")

        assert truck_id == "truck-1"
        supabase.update.assert_not_called()

    def test_existing_truck_without_registration_gets_backfilled(self):
        supabase = make_query_mock([{"id": "truck-1", "registration": None}])

        m.get_or_create_truck(supabase, "4309", "ABC123")

        supabase.update.assert_called_once_with({"registration": "ABC123"})

    def test_new_truck_is_created(self):
        # First execute() (the select) returns no rows, second (the
        # insert) returns the created row - a fixed side_effect list on
        # the shared execute() mock models that sequence.
        supabase = make_query_mock(None)
        supabase.execute.side_effect = [
            MagicMock(data=[]),
            MagicMock(data=[{"id": "truck-2"}]),
        ]

        truck_id = m.get_or_create_truck(supabase, "5374")

        assert truck_id == "truck-2"
        supabase.insert.assert_called_once_with(
            {"truck_number": "5374", "registration": None, "active": True}
        )

    def test_insert_returning_no_data_raises(self):
        supabase = make_query_mock(None)
        supabase.execute.side_effect = [
            MagicMock(data=[]),
            MagicMock(data=[]),
        ]

        with pytest.raises(RuntimeError):
            m.get_or_create_truck(supabase, "5374")


# ------------------------------------------------------------------
# get_existing_docket
# ------------------------------------------------------------------

class TestGetExistingDocket:

    def test_no_docket_number_returns_none_without_querying(self):
        supabase = MagicMock()

        result = m.get_existing_docket(
            supabase, {"docket_no": None, "docket_type": "concrete"}
        )

        assert result is None
        supabase.table.assert_not_called()

    def test_existing_docket_is_returned(self):
        supabase = make_query_mock(
            [{"id": "docket-1", "pdf_path": "concrete/123/original.pdf"}]
        )

        result = m.get_existing_docket(
            supabase,
            {
                "docket_no": "48851948",
                "docket_type": "concrete",
                "plant_no": "5488",
            },
        )

        assert result == {
            "id": "docket-1",
            "pdf_path": "concrete/123/original.pdf",
        }

    def test_no_match_returns_none(self):
        supabase = make_query_mock([])

        result = m.get_existing_docket(
            supabase, {"docket_no": "999", "docket_type": "concrete"}
        )

        assert result is None


# ------------------------------------------------------------------
# upload_pdf_to_supabase
# ------------------------------------------------------------------

class TestUploadPdfToSupabase:

    def test_successful_upload_returns_storage_path(self):
        supabase = MagicMock()

        path = m.upload_pdf_to_supabase(
            supabase, b"%PDF-1.4...", "docket.pdf", "12345", "concrete"
        )

        assert path == "concrete/12345/docket.pdf"
        supabase.storage.from_.assert_called_once_with(m.SUPABASE_BUCKET)

    def test_already_exists_is_treated_as_success(self):
        supabase = MagicMock()
        supabase.storage.from_.return_value.upload.side_effect = Exception(
            "Duplicate: object already exists"
        )

        path = m.upload_pdf_to_supabase(
            supabase, b"%PDF-1.4...", "docket.pdf", "12345", "concrete"
        )

        assert path == "concrete/12345/docket.pdf"

    def test_other_errors_are_raised(self):
        supabase = MagicMock()
        supabase.storage.from_.return_value.upload.side_effect = Exception(
            "network timeout"
        )

        with pytest.raises(Exception, match="network timeout"):
            m.upload_pdf_to_supabase(
                supabase, b"%PDF-1.4...", "docket.pdf", "12345", "concrete"
            )


# ------------------------------------------------------------------
# insert_docket
# ------------------------------------------------------------------

class TestInsertDocket:

    def test_builds_normalized_payload_and_returns_id(self):
        supabase = make_query_mock([{"id": "docket-1"}])

        docket_data = {
            "docket_no": "48851948",
            "docket_type": "concrete",
            "date": "02-09-26",
            "truck_no": "4309",
            "arrive_jobsite": "08:12",
            "time_finished": "10:19",
            "total_time_on_site": "2:7:0",
        }
        email_data = {"from": "docket@holcim.com", "subject": "Docket 48851948"}

        docket_id = m.insert_docket(supabase, docket_data, email_data, "path.pdf")

        assert docket_id == "docket-1"

        inserted = supabase.insert.call_args[0][0]
        assert inserted["docket_date"] == "2026-09-02"
        assert inserted["arrive_jobsite"] == "2026-09-02T08:12:00"
        assert inserted["time_finished"] == "2026-09-02T10:19:00"
        assert inserted["total_time_on_site"] == "02:07:00"
        assert inserted["pdf_path"] == "path.pdf"

    def test_none_fields_are_dropped_from_payload(self):
        supabase = make_query_mock([{"id": "docket-1"}])

        docket_data = {"docket_no": "1", "docket_type": "concrete"}
        email_data = {}

        m.insert_docket(supabase, docket_data, email_data, "path.pdf")

        inserted = supabase.insert.call_args[0][0]
        assert "docket_date" not in inserted
        assert "customer_name" not in inserted

    def test_no_data_returned_raises(self):
        supabase = make_query_mock([])

        with pytest.raises(RuntimeError):
            m.insert_docket(
                supabase,
                {"docket_no": "1", "docket_type": "concrete"},
                {},
                "path.pdf",
            )


# ------------------------------------------------------------------
# insert_docket_load
# ------------------------------------------------------------------

class TestInsertDocketLoad:

    def test_aggregates_load(self):
        supabase = make_query_mock([{"id": "load-1"}])

        docket_data = {
            "docket_type": "aggregates",
            "product": "10mm AGGREGATE",
            "material_code": "QPET10",
            "net_weight": 30.24,
            "gross_weight": 49.44,
            "tare_weight": 19.2,
        }

        load_id = m.insert_docket_load(supabase, "docket-1", docket_data)

        assert load_id == "load-1"

        inserted = supabase.insert.call_args[0][0]
        assert inserted["unit"] == "tonnes"
        assert inserted["quantity"] == 30.24

    def test_concrete_load(self):
        supabase = make_query_mock([{"id": "load-1"}])

        docket_data = {
            "docket_type": "concrete",
            "mix_description": "N32 14mm Pump",
            "this_load_m3": 7.2,
        }

        m.insert_docket_load(supabase, "docket-1", docket_data)

        inserted = supabase.insert.call_args[0][0]
        assert inserted["unit"] == "m3"
        assert inserted["quantity"] == 7.2
        assert inserted["product"] == "N32 14mm Pump"

    def test_unknown_docket_type_returns_none_without_querying(self):
        supabase = MagicMock()

        result = m.insert_docket_load(
            supabase, "docket-1", {"docket_type": "unknown"}
        )

        assert result is None
        supabase.table.assert_not_called()
