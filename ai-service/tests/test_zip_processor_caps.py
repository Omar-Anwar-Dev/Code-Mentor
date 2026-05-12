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
    # B-039: wording changed from "too many entries" to "too many analyzable
    # entries" when the cap now counts post-filter entries only.
    entries = {f"src/f_{i}.py": b"x = 1\n" for i in range(10)}
    zpath = _write_zip(tmp_path, entries)

    proc = ZipProcessor(max_entries=5)

    with pytest.raises(ValueError, match="too many analyzable entries"):
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


def test_entry_count_ignores_skipped_dirs_and_nonanalyzable_extensions(tmp_path):
    """B-039: max_entries should count only the entries that would survive
    the per-file _should_skip_path filter AND have an analyzable extension.

    A realistic multi-service repo carries a lot of `.git/`, `node_modules/`,
    build artifacts, README/.md/.json/.yaml/.lock files — those shouldn't
    push a project past the cap because none of them reach the AI.
    """
    z = tmp_path / "realrepo.zip"
    with zipfile.ZipFile(z, "w") as zf:
        # 8 entries in skipped directories — should NOT count toward max_entries
        zf.writestr(".git/HEAD", b"ref: refs/heads/main")
        zf.writestr(".git/config", b"[core]\n")
        zf.writestr(".git/objects/pack/pack-abc.idx", b"\x00" * 128)
        zf.writestr("node_modules/foo/index.js", b"//")
        zf.writestr("node_modules/foo/package.json", b"{}")
        zf.writestr("__pycache__/x.cpython.pyc", b"\x00")
        zf.writestr("dist/bundle.js", b"//min")
        zf.writestr(".vscode/settings.json", b"{}")
        # 3 entries with non-analyzable extensions — should NOT count either
        zf.writestr("README.md", b"# T")
        zf.writestr("requirements.txt", b"flask")
        zf.writestr("pyproject.toml", b"[tool.poetry]")
        # 3 entries that ARE analyzable — these are the only ones that count
        zf.writestr("src/a.py", b"x = 1\n")
        zf.writestr("src/b.py", b"y = 2\n")
        zf.writestr("src/c.py", b"z = 3\n")

    proc = ZipProcessor(max_entries=3)
    code_files, _ = proc.extract_and_process(z)
    assert len(code_files) == 3
    paths = sorted(f.path for f in code_files)
    assert paths == ["src/a.py", "src/b.py", "src/c.py"]


def test_entry_count_message_names_analyzable_in_overflow(tmp_path):
    """B-039: the error message changes wording from "too many entries" to
    "too many analyzable entries" so the operator can tell at a glance the
    cap was hit by real source files (not by .git noise). Substring
    'too many entries' still matches via "too many analyzable entries".
    """
    entries = {f"src/f_{i}.py": b"x = 1\n" for i in range(6)}
    zpath = _write_zip(tmp_path, entries)
    proc = ZipProcessor(max_entries=5)
    with pytest.raises(ValueError, match="too many analyzable entries"):
        proc.extract_and_process(zpath)
