# GS Sidhu Investments Pty Ltd

Docket ingestion pipeline and operations dashboard for an Australian concrete
agitator/trucking business.

**Live dashboard:** https://gssidhuinvestments.com

## What this does

1. Connects to Gmail via IMAP and searches configured supplier sender addresses
   (Holcim, Barro Group).
2. Finds PDF docket attachments, extracts their text, and determines the
   docket type (concrete or aggregates).
3. Parses the relevant fields from each docket (customer, plant, truck,
   quantities, timing).
4. Uploads the original PDF to Supabase Storage.
5. Stores structured docket data in Supabase Postgres, links each docket to a
   truck, and stores individual loads in `docket_loads`.
6. Uses idempotency checks (a unique index on docket number/type/plant) so the
   same docket is never imported twice.
7. Runs automatically every day via a scheduled GitHub Action.

A Next.js dashboard reads that data to show truck productivity, docket
history, customer/plant breakdowns, delivery trends, and turnaround times.

## Project structure

```text
Codebase/
├── Email Scraper/          # Python ingestion pipeline
│   ├── email_scraper_main.py
│   ├── credentials.yaml    # gitignored - Gmail + Supabase credentials
│   └── emails.json         # configured supplier sender addresses
├── Database/
│   └── supabase_email_scraper/
│       └── supabase/
│           └── migrations/ # SQL schema, views, and RPC functions
├── Webpage/                # Next.js operations dashboard
└── .github/workflows/      # scheduled daily ingestion run
```

## Tech stack

- **Ingestion:** Python 3, `pypdf` + `pdftotext` (poppler) for PDF parsing,
  PyYAML for config, the Supabase Python client.
- **Database:** Supabase Postgres, with SQL views/functions backing the
  dashboard's aggregate queries, and Supabase Storage for the original PDFs.
- **Dashboard:** Next.js (App Router) + TypeScript, Supabase Auth for
  login, Tailwind CSS, Recharts. Hosted on Vercel.

## Running the ingestion pipeline locally

```bash
pip install -r requirements.txt
python "Email Scraper/email_scraper_main.py"
```

Requires `Email Scraper/credentials.yaml` (gitignored) with `user`,
`password` (a Gmail app password), `supabase_url`, and `supabase_key`
(service role key - this script bypasses RLS by design). Also requires
`poppler` installed locally (`brew install poppler`) for Barro docket
parsing.

In production this runs daily via `.github/workflows/docket-ingest.yml`,
using repo secrets (`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `SUPABASE_URL`,
`SUPABASE_KEY`). It can also be triggered manually from the Actions tab with
a custom `days` lookback for backfills.

## Running the dashboard locally

```bash
cd Webpage
npm install
cp .env.local.example .env.local  # fill in your Supabase URL + anon key
npm run dev
```

Accounts are admin-created (Supabase Dashboard → Authentication → Users) -
there's no public sign-up, since any authenticated user has full read access
under the current RLS policy.

## Database migrations

```bash
cd Database/supabase_email_scraper
supabase db push
```
