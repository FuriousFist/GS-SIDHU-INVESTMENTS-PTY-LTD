"""Tests for process_pdf_attachments - the orchestration layer that ties
parsing, dedup, upload and insert together for each PDF attachment on an
email.

Its collaborators (parse_docket_pdf, get_existing_docket,
upload_pdf_to_supabase, insert_docket, insert_docket_load) are each
tested in isolation elsewhere, so here they're monkeypatched and the
test only checks process_pdf_attachments' own branching: which status
each combination of inputs produces, and that it keeps going after a
per-attachment failure instead of aborting the whole email.
"""

from email.message import EmailMessage
from unittest.mock import MagicMock

import email_scraper_main as m


def make_message_with_pdf(filename="docket.pdf", payload=b"%PDF-1.4 fake"):
    msg = EmailMessage()
    msg["From"] = "docket@holcim.com"
    msg["Subject"] = "Docket export"
    msg.set_content("See attached.")
    msg.add_attachment(
        payload, maintype="application", subtype="pdf", filename=filename
    )
    return msg


class TestProcessPdfAttachments:

    def test_non_pdf_attachments_are_skipped(self, monkeypatch):
        msg = EmailMessage()
        msg.set_content("no attachment here")
        parse_mock = MagicMock()
        monkeypatch.setattr(m, "parse_docket_pdf", parse_mock)

        result = m.process_pdf_attachments(msg, MagicMock())

        assert result == []
        parse_mock.assert_not_called()

    def test_new_docket_is_imported(self, monkeypatch):
        msg = make_message_with_pdf()
        docket_data = {"docket_type": "concrete", "docket_no": "48851948"}

        monkeypatch.setattr(m, "parse_docket_pdf", lambda payload: docket_data)
        monkeypatch.setattr(m, "get_existing_docket", lambda supabase, d: None)
        monkeypatch.setattr(
            m,
            "upload_pdf_to_supabase",
            lambda supabase, payload, filename, no, dtype: "concrete/48851948/docket.pdf",
        )
        monkeypatch.setattr(
            m, "insert_docket", lambda supabase, d, e, path: "docket-1"
        )
        monkeypatch.setattr(
            m, "insert_docket_load", lambda supabase, docket_id, d: "load-1"
        )

        [attachment] = m.process_pdf_attachments(msg, MagicMock())

        assert attachment["status"] == "imported"
        assert attachment["docket_id"] == "docket-1"
        assert attachment["load_id"] == "load-1"
        assert attachment["pdf_path"] == "concrete/48851948/docket.pdf"
        assert attachment["filename"] == "docket.pdf"

    def test_existing_docket_is_skipped_not_reimported(self, monkeypatch):
        msg = make_message_with_pdf()
        docket_data = {"docket_type": "concrete", "docket_no": "48851948"}

        monkeypatch.setattr(m, "parse_docket_pdf", lambda payload: docket_data)
        monkeypatch.setattr(
            m,
            "get_existing_docket",
            lambda supabase, d: {"id": "docket-1", "pdf_path": "existing.pdf"},
        )
        upload_mock = MagicMock()
        monkeypatch.setattr(m, "upload_pdf_to_supabase", upload_mock)

        [attachment] = m.process_pdf_attachments(msg, MagicMock())

        assert attachment["status"] == "already_exists"
        assert attachment["docket_id"] == "docket-1"
        upload_mock.assert_not_called()

    def test_unknown_docket_type_is_recorded_without_inserting(
        self, monkeypatch
    ):
        msg = make_message_with_pdf()
        docket_data = {"docket_type": "unknown", "raw_text": "???"}

        monkeypatch.setattr(m, "parse_docket_pdf", lambda payload: docket_data)
        get_existing_mock = MagicMock()
        monkeypatch.setattr(m, "get_existing_docket", get_existing_mock)

        [attachment] = m.process_pdf_attachments(msg, MagicMock())

        assert attachment["status"] == "unknown_docket_type"
        get_existing_mock.assert_not_called()

    def test_missing_docket_number_is_recorded_without_inserting(
        self, monkeypatch
    ):
        msg = make_message_with_pdf()
        docket_data = {"docket_type": "concrete", "docket_no": None}

        monkeypatch.setattr(m, "parse_docket_pdf", lambda payload: docket_data)
        get_existing_mock = MagicMock()
        monkeypatch.setattr(m, "get_existing_docket", get_existing_mock)

        [attachment] = m.process_pdf_attachments(msg, MagicMock())

        assert attachment["status"] == "missing_docket_number"
        get_existing_mock.assert_not_called()

    def test_unparseable_pdf_is_skipped_entirely(self, monkeypatch):
        msg = make_message_with_pdf()
        monkeypatch.setattr(m, "parse_docket_pdf", lambda payload: None)

        result = m.process_pdf_attachments(msg, MagicMock())

        assert result == []

    def test_failure_during_insert_is_recorded_and_does_not_raise(
        self, monkeypatch
    ):
        msg = make_message_with_pdf()
        docket_data = {"docket_type": "concrete", "docket_no": "48851948"}

        monkeypatch.setattr(m, "parse_docket_pdf", lambda payload: docket_data)
        monkeypatch.setattr(m, "get_existing_docket", lambda supabase, d: None)
        monkeypatch.setattr(
            m,
            "upload_pdf_to_supabase",
            lambda supabase, payload, filename, no, dtype: "concrete/48851948/docket.pdf",
        )

        def raise_insert(supabase, d, e, path):
            raise RuntimeError("insert failed")

        monkeypatch.setattr(m, "insert_docket", raise_insert)

        [attachment] = m.process_pdf_attachments(msg, MagicMock())

        assert attachment["status"] == "failed"
        assert "insert failed" in attachment["error"]

    def test_two_attachments_one_failing_both_are_recorded(self, monkeypatch):
        msg = EmailMessage()
        msg["From"] = "docket@holcim.com"
        msg["Subject"] = "Two dockets"
        msg.set_content("See attached.")
        msg.add_attachment(
            b"%PDF good", maintype="application", subtype="pdf", filename="good.pdf"
        )
        msg.add_attachment(
            b"%PDF bad", maintype="application", subtype="pdf", filename="bad.pdf"
        )

        def fake_parse(payload):
            return {
                "docket_type": "concrete",
                "docket_no": "1" if payload == b"%PDF good" else None,
            }

        monkeypatch.setattr(m, "parse_docket_pdf", fake_parse)
        monkeypatch.setattr(m, "get_existing_docket", lambda supabase, d: None)
        monkeypatch.setattr(
            m,
            "upload_pdf_to_supabase",
            lambda supabase, payload, filename, no, dtype: "path.pdf",
        )
        monkeypatch.setattr(
            m, "insert_docket", lambda supabase, d, e, path: "docket-1"
        )
        monkeypatch.setattr(
            m, "insert_docket_load", lambda supabase, docket_id, d: "load-1"
        )

        results = m.process_pdf_attachments(msg, MagicMock())

        statuses = {r["filename"]: r["status"] for r in results}
        assert statuses == {
            "good.pdf": "imported",
            "bad.pdf": "missing_docket_number",
        }
