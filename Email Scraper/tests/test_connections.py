"""Tests for the connection-setup boundary: credential loading, Gmail
IMAP, and the Supabase client. Each external constructor
(imaplib.IMAP4_SSL, create_client) is monkeypatched so these run
offline with no real network calls or credentials.
"""

from unittest.mock import MagicMock

import pytest
import yaml

import email_scraper_main as m


# ------------------------------------------------------------------
# load_credentials
# ------------------------------------------------------------------

class TestLoadCredentials:

    def test_loads_valid_credentials_file(self, tmp_path):
        path = tmp_path / "credentials.yaml"
        path.write_text(
            yaml.dump(
                {
                    "user": "docket@example.com",
                    "password": "app-password",
                    "supabase_url": "https://project.supabase.co",
                    "supabase_key": "service-role-key",
                }
            )
        )

        credentials = m.load_credentials(str(path))

        assert credentials["user"] == "docket@example.com"
        assert credentials["supabase_url"] == "https://project.supabase.co"

    def test_missing_required_key_raises(self, tmp_path):
        path = tmp_path / "credentials.yaml"
        path.write_text(yaml.dump({"user": "docket@example.com"}))

        with pytest.raises(KeyError):
            m.load_credentials(str(path))

    def test_missing_file_raises(self, tmp_path):
        with pytest.raises(Exception):
            m.load_credentials(str(tmp_path / "does_not_exist.yaml"))


# ------------------------------------------------------------------
# connect_to_gmail_imap
# ------------------------------------------------------------------

class TestConnectToGmailImap:

    def test_logs_in_and_selects_inbox(self, monkeypatch):
        fake_connection = MagicMock()
        fake_imap4_ssl = MagicMock(return_value=fake_connection)
        monkeypatch.setattr(m.imaplib, "IMAP4_SSL", fake_imap4_ssl)

        mail = m.connect_to_gmail_imap("docket@example.com", "app-password")

        fake_imap4_ssl.assert_called_once_with("imap.gmail.com")
        fake_connection.login.assert_called_once_with(
            "docket@example.com", "app-password"
        )
        fake_connection.select.assert_called_once_with("INBOX")
        assert mail is fake_connection

    def test_login_failure_is_raised(self, monkeypatch):
        fake_connection = MagicMock()
        fake_connection.login.side_effect = Exception("bad credentials")
        monkeypatch.setattr(
            m.imaplib, "IMAP4_SSL", MagicMock(return_value=fake_connection)
        )

        with pytest.raises(Exception, match="bad credentials"):
            m.connect_to_gmail_imap("docket@example.com", "wrong-password")


# ------------------------------------------------------------------
# connect_to_supabase
# ------------------------------------------------------------------

class TestConnectToSupabase:

    def test_creates_client_from_credentials(self, monkeypatch):
        fake_client = MagicMock()
        fake_create_client = MagicMock(return_value=fake_client)
        monkeypatch.setattr(m, "create_client", fake_create_client)

        supabase = m.connect_to_supabase(
            {
                "supabase_url": "https://project.supabase.co",
                "supabase_key": "service-role-key",
            }
        )

        fake_create_client.assert_called_once_with(
            "https://project.supabase.co", "service-role-key"
        )
        assert supabase is fake_client

    def test_missing_keys_raise(self):
        with pytest.raises(Exception):
            m.connect_to_supabase({})
