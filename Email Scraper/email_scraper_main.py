import yaml
import logging
import imaplib
import pandas as pd
import json
import email
from datetime import datetime, timedelta
import os


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

        mail.select('inbox')

        return mail

    except Exception as e:

        logging.error("Connection failed: {}".format(e))

        raise


def get_email_body(msg):

    if msg.is_multipart():

        for part in msg.walk():

            if part.get_content_type() == "text/plain":

                payload = part.get_payload(decode=True)

                if payload:

                    return payload.decode(
                        part.get_content_charset() or "utf-8",
                        errors="replace"
                    )

    else:

        payload = msg.get_payload(decode=True)

        if payload:

            return payload.decode(
                msg.get_content_charset() or "utf-8",
                errors="replace"
            )

    return ""

def save_pdf_attachments(msg, output_folder):
    pdf_files = []

    for part in msg.walk():

        content_disposition = part.get("Content-Disposition")

        if content_disposition and "attachment" in content_disposition:

            filename = part.get_filename()

            if filename and filename.lower().endswith(".pdf"):

                filepath = f"{output_folder}/{filename}"

                with open(filepath, "wb") as file:
                    file.write(part.get_payload(decode=True))

                pdf_files.append(filepath)

    return pdf_files


def get_docket_emails(mail, file_path, days):

    try:

        with open(file_path, "r") as file:

            data = json.load(file)

            emails_to_check = data["emails"]

    except Exception as e:

        logging.error("Failed to load emails: {}".format(e))

        raise

    # Calculate the earliest date to search
    start_date = datetime.now() - timedelta(days=days)

    # Gmail IMAP date format
    start_date = start_date.strftime("%d-%b-%Y")

    results = {}

    for sender in emails_to_check:

        try:

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

            results[sender] = []

            for email_id in email_ids:

                status, data = mail.fetch(
                    email_id,
                    "(RFC822)"
                )

                if status != "OK":
                    continue

                raw_email = data[0][1]

                msg = email.message_from_bytes(raw_email)

                pdf_files = save_pdf_attachments( msg, "Email Scraper/pdfs")

                results[sender].append({
                    "from": msg["From"],
                    "to": msg["To"],
                    "subject": msg["Subject"],
                    "date": msg["Date"],
                    "body": get_email_body(msg),
                    "pdf_attachments": pdf_files
                })

        except Exception as e:

            logging.error(
                f"Failed to retrieve emails from {sender}: {e}"
            )

    return results


def main():

    print("Running main...")

    credentials = load_credentials(
        'Email Scraper/credentials.yaml'
    )

    print("1. Credentials loaded")

    mail = connect_to_gmail_imap(
        *credentials
    )

    print("2. Connected to Gmail")

    os.makedirs("Email Scraper/pdfs", exist_ok=True)

    docket_emails = get_docket_emails(
        mail,
        'Email Scraper/emails.json',
        1
    )

    print("3. Emails retrieved")

    # Save emails to JSON file
    with open(
        'Email Scraper/docket_emails.json',
        'w',
        encoding='utf-8'
    ) as file:

        json.dump(
            docket_emails,
            file,
            indent=4,
            ensure_ascii=False
        )

    print("4. Emails saved to docket_emails.json")

    mail.close()
    mail.logout()

    print("5. Finished")


if __name__ == "__main__":

    main()
