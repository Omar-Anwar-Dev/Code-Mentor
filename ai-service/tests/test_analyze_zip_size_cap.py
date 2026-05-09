"""S5-T8: /api/analyze-zip Content-Length guard → 413."""
import io
import zipfile

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import get_settings


@pytest.fixture
def client():
    return TestClient(app)


def _tiny_zip_bytes() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("a.py", b"x = 1\n")
    return buf.getvalue()


def test_rejects_oversize_upload_with_413(client, monkeypatch):
    # Lower the cap so we don't need a real 50MB payload in tests.
    settings = get_settings()
    monkeypatch.setattr(settings, "max_zip_size_bytes", 100)

    big_payload = b"\x00" * 500  # 500 bytes > 100 byte cap
    files = {"file": ("big.zip", big_payload, "application/zip")}

    resp = client.post("/api/analyze-zip", files=files)

    assert resp.status_code == 413
    assert "too large" in resp.json()["detail"].lower()


def test_rejects_non_zip_filename_with_400(client):
    files = {"file": ("notes.txt", b"hello", "text/plain")}

    resp = client.post("/api/analyze-zip", files=files)

    assert resp.status_code == 400
    assert "zip" in resp.json()["detail"].lower()


def test_accepts_small_valid_zip(client):
    # Sanity: a small valid ZIP passes past the size guard.
    # It will likely fail downstream (no AI key or analyzers in the test env),
    # but it must NOT 413 or 400.
    files = {"file": ("tiny.zip", _tiny_zip_bytes(), "application/zip")}
    resp = client.post("/api/analyze-zip", files=files)
    assert resp.status_code not in (400, 413), resp.text
