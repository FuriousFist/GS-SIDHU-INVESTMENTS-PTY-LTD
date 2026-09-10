import sys
from pathlib import Path

import pytest

# "Email Scraper" contains a space, which breaks pytest's whitespace-split
# ini options (testpaths / pythonpath), so the import path is wired up here
# in code instead.
SCRAPER_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRAPER_DIR))

PDFS_DIR = SCRAPER_DIR / "pdfs"
FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


@pytest.fixture
def load_pdf():
    """Factory fixture: load_pdf("AGGREGATES") returns the bytes of the
    first sample docket PDF matching that sender prefix (AGGREGATES / ALL
    / HOLCIM), sorted for a stable pick.

    Email Scraper/pdfs/ holds real customer docket data and is
    gitignored, so it won't exist on a fresh checkout (e.g. in CI) - skip
    rather than fail when a sample isn't available locally.
    """

    def _load(prefix: str) -> bytes:

        matches = sorted(PDFS_DIR.glob(f"{prefix}_*"))

        if not matches:
            pytest.skip(
                f"No local sample PDF for prefix {prefix!r} in {PDFS_DIR} "
                "(Email Scraper/pdfs/ is gitignored - real dockets only "
                "exist on machines that have run the scraper)"
            )

        return matches[0].read_bytes()

    return _load


@pytest.fixture
def fixture_pdf():
    """Factory fixture: fixture_pdf("fixture_aggregates.pdf") returns the
    bytes of a committed synthetic docket PDF from
    Email Scraper/tests/fixtures/ (fabricated data, safe for CI - see
    fixtures/generate_fixtures.py)."""

    def _load(filename: str) -> bytes:
        return (FIXTURES_DIR / filename).read_bytes()

    return _load
