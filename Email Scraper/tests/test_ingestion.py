"""Tests for get_docket_emails (the per-sender IMAP search/fetch loop)
and save_json_output. process_pdf_attachments is monkeypatched here too
- it's covered on its own in test_process_attachments.py - so these
focus on get_docket_emails' own job: reading the sender list, building
the search query, and not letting one sender's failure stop the rest.
"""

import json
from email.message import EmailMessage

import pytest

import email_scraper_main as m


def make_mail_mock(search_results, fetch_results):
    """A fake IMAP connection.

    search_results: {sender: (status, [b"1 2 3"])}
    fetch_results: {email_id_bytes: (status, [(None, raw_email_bytes)])}
    """

    class FakeMail:
        def search(self, charset, query):
            for sender, result in search_results.items():
                if f'FROM "{sender}"' in query:
                    return result
            return "OK", [b""]

        def fetch(self, email_id, parts):
            return fetch_results[email_id]

    return FakeMail()


def make_raw_email(subject="Docket 1", sender="docket@holcim.com"):
    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = "ingest@example.com"
    msg["Subject"] = subject
    msg["Date"] = "Wed, 02 Sep 2026 08:00:00 +1000"
    msg.set_content("body")
    return msg.as_bytes()


class TestGetDocketEmails:

    def test_processes_emails_for_each_configured_sender(
        self, tmp_path, monkeypatch
    ):
        emails_file = tmp_path / "emails.json"
        emails_file.write_text(json.dumps({"emails": ["docket@holcim.com"]}))

        mail = make_mail_mock(
            search_results={"docket@holcim.com": ("OK", [b"1"])},
            fetch_results={b"1": ("OK", [(None, make_raw_email())])},
        )

        monkeypatch.setattr(
            m,
            "process_pdf_attachments",
            lambda msg, supabase: [{"filename": "docket.pdf", "status": "imported"}],
        )

        results = m.get_docket_emails(mail, str(emails_file), 1, supabase=None)

        assert list(results.keys()) == ["docket@holcim.com"]
        assert len(results["docket@holcim.com"]) == 1
        assert results["docket@holcim.com"][0]["subject"] == "Docket 1"
        assert results["docket@holcim.com"][0]["attachments"] == [
            {"filename": "docket.pdf", "status": "imported"}
        ]

    def test_missing_emails_file_raises(self, tmp_path):
        with pytest.raises(Exception):
            m.get_docket_emails(
                mail=None,
                file_path=str(tmp_path / "missing.json"),
                days=1,
                supabase=None,
            )

    def test_search_failure_for_one_sender_does_not_stop_others(
        self, tmp_path, monkeypatch
    ):
        emails_file = tmp_path / "emails.json"
        emails_file.write_text(
            json.dumps({"emails": ["broken@sender.com", "docket@holcim.com"]})
        )

        mail = make_mail_mock(
            search_results={
                "broken@sender.com": ("NO", [b""]),
                "docket@holcim.com": ("OK", [b"1"]),
            },
            fetch_results={b"1": ("OK", [(None, make_raw_email())])},
        )

        monkeypatch.setattr(
            m, "process_pdf_attachments", lambda msg, supabase: []
        )

        results = m.get_docket_emails(mail, str(emails_file), 1, supabase=None)

        assert "broken@sender.com" not in results
        assert "docket@holcim.com" in results

    def test_no_emails_found_for_sender_gives_empty_list(
        self, tmp_path, monkeypatch
    ):
        emails_file = tmp_path / "emails.json"
        emails_file.write_text(json.dumps({"emails": ["docket@holcim.com"]}))

        mail = make_mail_mock(
            search_results={"docket@holcim.com": ("OK", [b""])},
            fetch_results={},
        )

        results = m.get_docket_emails(mail, str(emails_file), 1, supabase=None)

        assert results["docket@holcim.com"] == []


class TestSaveJsonOutput:

    def test_writes_json_file(self, tmp_path):
        output_path = tmp_path / "docket_emails.json"

        m.save_json_output({"key": "value"}, str(output_path))

        assert json.loads(output_path.read_text()) == {"key": "value"}

    def test_creates_missing_parent_directories(self, tmp_path):
        output_path = tmp_path / "nested" / "dir" / "docket_emails.json"

        m.save_json_output({"key": "value"}, str(output_path))

        assert output_path.exists()

    def test_write_failure_is_logged_not_raised(self, tmp_path):
        # A path with a null byte is invalid on every OS and raises
        # ValueError inside open() - save_json_output should log it and
        # return normally rather than propagate.
        m.save_json_output({"key": "value"}, str(tmp_path) + "\0/bad.json")
