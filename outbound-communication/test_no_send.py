"""Fails if any send capability is reintroduced into outbound-communication."""
import re
from pathlib import Path

FORBIDDEN = [r"\.Send\(", r"sendMail", r"api\.resend\.com", r"send_message", r"send_via_"]


def test_no_send_paths():
    here = Path(__file__).parent
    for f in here.glob("*.py"):
        if f.name == Path(__file__).name:
            continue
        text = f.read_text(encoding="utf-8")
        for pattern in FORBIDDEN:
            assert not re.search(pattern, text), f"{f.name} contains forbidden send path: {pattern}"


if __name__ == "__main__":
    test_no_send_paths()
    print("OK: no send paths")
