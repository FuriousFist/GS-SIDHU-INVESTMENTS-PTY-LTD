import yaml
import logging
import imaplib
import pandas as pd
import json
import email

def load_credentials(filepath):
    try:
        with open(filepath, 'r') as file:
            credentials = yaml.safe_load(file)
            user = credentials['user']
            password = credentials['password']
            return user, password
    except Exception as e:
        logging.error("Failed to load credentials: {}".format(e))
        raise

def connect_to_gmail_imap(user, password):
    imap_url = 'imap.gmail.com'
    try:
        mail = imaplib.IMAP4_SSL(imap_url)
        mail.login(user, password)
        mail.select('inbox')  # Connect to the inbox.
        return mail
    except Exception as e:
        logging.error("Connection failed: {}".format(e))
        raise

def get_email_body(msg):

    if msg.is_multipart():

        for part in msg.walk():

            if part.get_content_type() == "text/plain":
                return part.get_payload(
                    decode=True
                ).decode(
                    part.get_content_charset() or "utf-8",
                    errors="replace"
                )

    else:

        return msg.get_payload(
            decode=True
        ).decode(
            msg.get_content_charset() or "utf-8",
            errors="replace"
        )

    return ""


def get_docket_emails(mail, file_path):

    try:
        with open(file_path, "r") as file:
            data = json.load(file)
            emails_to_check = data["emails"]

    except Exception as e:
        logging.error("Failed to load emails: {}".format(e))
        raise

    results = {}

    for sender in emails_to_check:

        try:
            status, messages = mail.search( None, f'FROM "{sender}"')

            if status != "OK":
                logging.error(f"Failed to search emails from {sender}")
                continue

            email_ids = messages[0].split()

            results[sender] = []

            for email_id in email_ids:

                status, data = mail.fetch(email_id, "(RFC822)")

                if status != "OK":
                    continue

                raw_email = data[0][1]

                msg = email.message_from_bytes(raw_email)

                results[sender].append({
                    "from": msg["From"],
                    "to": msg["To"],
                    "subject": msg["Subject"],
                    "date": msg["Date"],
                    "body": get_email_body(msg)
                })

        except Exception as e:
            logging.error(
                f"Failed to retrieve emails from {sender}: {e}"
            )

    return results



def main():
    credentials = load_credentials('Email Scraper/credentials.yaml')
    mail = connect_to_gmail_imap(*credentials)
    docket_emails = get_docket_emails(mail, 'Email Scraper/emails.json')
    print(docket_emails)
    
if __name__ == "__main__":
    main()
