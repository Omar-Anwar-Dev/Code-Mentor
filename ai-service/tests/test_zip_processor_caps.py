"""S5-T8: ZipProcessor entry-count + uncompressed-size guards."""
import io
import zipfile
from pathlib import Path

import pytest

from app.services.zip_processor import ZipProcessor


def _write_zip(tmp_path: Path, entries: dict[str, bytes]) -> Path:
    z = tmp_path / "t.zip"
    with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, payload in entries.items():
            zf.writestr(name, payload)
    return z


def test_rejects_archive_with_too_many_entries(tmp_path):
    entries = {f"src/f_{i}.py": b"x = 1\n" for i in range(10)}
    zpath = _write_zip(tmp_path, entries)

    proc = ZipProcessor(max_entries=5)

    with pytest.raises(ValueError, match="too many entries"):
        proc.extract_and_process(zpath)


def test_accepts_archive_at_entry_limit(tmp_path):
    entries = {f"src/f_{i}.py": b"x = 1\n" for i in range(5)}
    zpath = _write_zip(tmp_path, entries)

    proc = ZipProcessor(max_entries=5)

    code_files, project = proc.extract_and_process(zpath)
    assert len(code_files) == 5
    assert project == "t"


def test_rejects_archive_when_declared_uncompressed_exceeds_limit(tmp_path):
    # Single 2KB file, limit 1KB → should reject pre-extraction.
    entries = {"big.py": b"a" * 2048}
    zpath = _write_zip(tmp_path, entries)

    proc = ZipProcessor(max_uncompressed_bytes=1024)

    with pytest.raises(ValueError, match="uncompressed size too large"):
        proc.extract_and_process(zpath)


def test_corrupt_zip_raises_value_error(tmp_path):
    bad = tmp_path / "bad.zip"
    bad.write_bytes(b"not a zip file")

    proc = ZipProcessor()

    with pytest.raises(ValueError, match="Invalid ZIP file"):
        proc.extract_and_process(bad)


def test_entry_count_excludes_directory_entries(tmp_path):
    # 3 real files + 2 explicit dir entries → counted as 3.
    z = tmp_path / "t.zip"
    with zipfile.ZipFile(z, "w") as zf:
        zf.writestr("src/", b"")
        zf.writestr("src/sub/", b"")
        zf.writestr("src/a.py", b"x = 1\n")
        zf.writestr("src/b.py", b"y = 2\n")
        zf.writestr("src/sub/c.py", b"z = 3\n")

    proc = ZipProcessor(max_entries=3)
    code_files, _ = proc.extract_and_process(z)
    assert len(code_files) == 3
