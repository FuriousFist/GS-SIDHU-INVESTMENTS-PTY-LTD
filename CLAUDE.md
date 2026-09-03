# CLAUDE.md

## Project Overview

This project is an automated docket ingestion system for an Australian concrete agitator/trucking business.

The system currently:

1. Connects to Gmail via IMAP.
2. Searches configured sender emails.
3. Finds PDF docket attachments.
4. Extracts text from PDFs.
5. Determines the docket type:
   - Concrete
   - Aggregates
6. Parses relevant docket fields.
7. Uploads the original PDF to Supabase Storage.
8. Stores structured docket data in Supabase PostgreSQL.
9. Links dockets to trucks.
10. Stores individual loads in `docket_loads`.
11. Uses idempotency checks so the same docket is not imported twice.

The long-term goal is to build a business dashboard/web application showing truck productivity, driver performance, revenue/profitability, expenses, fleet performance, and operational metrics.

---

## Tech Stack

- Python 3
- Gmail IMAP
- `pypdf` for PDF parsing
- PyYAML for configuration
- Supabase Python client
- Supabase PostgreSQL
- Supabase Storage
- Future frontend/dashboard: TBD

---

## Project Structure

Expected structure:

```text
Codebase/
├── CLAUDE.md
├── Email Scraper/
│   ├── email_scraper_main.py
│   ├── credentials.yaml
│   ├── emails.json
│   └── docket_emails.json
├── supabase/
│   └── migrations/
└── Database/
```
