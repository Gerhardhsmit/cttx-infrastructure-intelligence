"""Regression tests for load_drafts.py. Runs without Outlook (a fake worker stands in).
The one-click launcher runs this before loading; if it fails, nothing is loaded."""
import builtins
import sys
import tempfile
import warnings
from pathlib import Path

warnings.simplefilter("error", SyntaxWarning)
HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
import load_drafts as L  # noqa: E402

EML = """From: Gerhard Smit <gerhard@cttx.co.za>
To: Test Person <{to}>
Cc: gerhard@cttx.co.za
Subject: Test: the network, in one page
Date: Mon, 28 Sep 2026 07:30:00 +0200
X-Unsent: 1
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
{extra}
Test,

Gerhard Smit here, CTTX in Gqeberha. This sentence is long enough to be
wrapped by the writer and must come back as one line in Outlook.

Gerhard Smit
Director | CTTX Services (Pty) Ltd
"""


class FakeWorker:
    calls = []

    def create_draft_in_outlook(self, to, subject, body, body_type, cc, attachments=None):
        FakeWorker.calls.append((to, subject, body, [a.name for a in attachments or []]))
        return {"success": True, "location": "gerhard@cttx.co.za \\\\ Drafts", "replaced": 0}


def run(folder, *argv):
    sys.argv = ["load_drafts.py", "--folder", str(folder), *argv]
    L.main()


def test_all():
    L.OutboundWorker = FakeWorker
    builtins.input = lambda *_: "y"
    repo = Path(tempfile.mkdtemp())
    L.REPO_ROOT = repo
    L.OUTREACH_DIR = repo / "sales-engine" / "outreach"
    out = L.OUTREACH_DIR / "2026-09-28-test"
    out.mkdir(parents=True)
    (out / "A - DRAFT_Test_Person_Assessment_20260928.eml").write_text(
        EML.format(to="test.person@example.co.za", extra="X-CTTX-Attach: study.pdf"), encoding="utf-8")
    (out / "study.pdf").write_bytes(b"%PDF-1.4")
    (out / "B - DRAFT_Info_Assessment_20260928.eml").write_text(EML.format(to="info@example.co.za", extra=""), encoding="utf-8")
    (out / "C - DRAFT_Missing_Assessment_20260928.eml").write_text(
        EML.format(to="named@example.co.za", extra="X-CTTX-Attach: missing.pdf"), encoding="utf-8")
    desk = Path(tempfile.mkdtemp())

    run(desk, "--from-repo")
    assert len(FakeWorker.calls) == 1, FakeWorker.calls                   # generic rejected, missing attachment failed
    to, subject, body, att = FakeWorker.calls[0]
    assert att == ["study.pdf"], att                                       # attachment carried
    assert "wrapped by the writer and must come back as one line" in body  # reflowed paragraph
    assert "Gerhard Smit\nDirector" in body                                # signature kept on its own lines

    run(desk, "--from-repo")
    assert len(FakeWorker.calls) == 1                                      # ledger: no duplicates

    run(desk, "--reload", "2026-09-28-test")
    assert len(FakeWorker.calls) == 2                                      # explicit reload works


if __name__ == "__main__":
    test_all()
    print("OK: loader tests passed")
