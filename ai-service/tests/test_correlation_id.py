"""S5-T10: /api/analyze-zip reads X-Correlation-Id and emits it into logs so
the backend's job log and the AI service's request log can be joined."""
import io
import logging
import zipfile

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def _tiny_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("a.py", b"x = 1\n")
    return buf.getvalue()


def test_analyze_zip_logs_correlation_id_from_header(client, caplog):
    caplog.set_level(logging.INFO, logger="app.api.routes.analysis")

    files = {"file": ("t.zip", _tiny_zip(), "application/zip")}
    headers = {"X-Correlation-Id": "corr-abc123"}

    # Don't care whether the downstream analyzer/AI path succeeds — we only
    # assert the correlation id gets into the log before any branching.
    client.post("/api/analyze-zip", files=files, headers=headers)

    matching = [r for r in caplog.records if "corr=corr-abc123" in r.getMessage()]
    assert matching, "expected at least one log line mentioning corr=corr-abc123"


def test_analyze_zip_logs_dash_when_header_missing(client, caplog):
    caplog.set_level(logging.INFO, logger="app.api.routes.analysis")

    files = {"file": ("t.zip", _tiny_zip(), "application/zip")}
    client.post("/api/analyze-zip", files=files)

    matching = [r for r in caplog.records if "corr=-" in r.getMessage()]
    assert matching, "expected log line with placeholder corr=- when header missing"
