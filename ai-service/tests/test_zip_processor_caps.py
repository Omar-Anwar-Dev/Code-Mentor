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


def test_entry_count_ignores_skipped_dirs(tmp_path):
    """B-039 + SBF-1: max_entries counts only entries that survive the
    skip-dir filter AND the analyzable-name/extension filter.

    Post-SBF-1 the analyzable set was widened (README.md, requirements.txt,
    pyproject.toml, package.json etc. are now extracted so the AI sees
    project shape). This test pins what STILL gets filtered: anything under
    a skipped directory (`.git/`, `node_modules/`, build artifacts) and
    truly opaque binaries (no whitelisted extension or basename).
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
        # 3 binary/opaque entries with no whitelist match — should NOT count
        zf.writestr("public/logo.png", b"\x89PNG\x00")
        zf.writestr("font.woff2", b"\x77OFF2")
        zf.writestr("video.mp4", b"\x00\x00mp4")
        # 3 source files — these are the only ones we cap on
        zf.writestr("src/a.py", b"x = 1\n")
        zf.writestr("src/b.py", b"y = 2\n")
        zf.writestr("src/c.py", b"z = 3\n")

    proc = ZipProcessor(max_entries=3)
    code_files, _ = proc.extract_and_process(z)
    assert len(code_files) == 3
    paths = sorted(f.path.replace("\\", "/") for f in code_files)
    assert paths == ["src/a.py", "src/b.py", "src/c.py"]


def test_widened_whitelist_extracts_config_and_runfiles(tmp_path):
    """SBF-1 / B3: `.yaml`, `.toml`, `Dockerfile`, `Makefile`, README.md,
    package.json — and similar config/run files — must all be extracted now
    so the AI sees the full project shape (not just .py/.js)."""
    z = tmp_path / "fullproj.zip"
    with zipfile.ZipFile(z, "w") as zf:
        zf.writestr("src/main.py", b"print('hi')\n")
        zf.writestr("Dockerfile", b"FROM python:3.12\n")
        zf.writestr("docker-compose.yml", b"version: '3.9'\n")
        zf.writestr(".github/workflows/ci.yml", b"name: CI\n")
        zf.writestr("Makefile", b"all:\n\techo hi\n")
        zf.writestr("pyproject.toml", b"[project]\nname='x'\n")
        zf.writestr("package.json", b'{"name":"x"}')
        zf.writestr("README.md", b"# Title\n")
        zf.writestr("requirements.txt", b"flask\n")

    proc = ZipProcessor(max_entries=20)
    code_files, _ = proc.extract_and_process(z)
    paths = sorted(f.path.replace("\\", "/") for f in code_files)
    # Each of these must reach the AI.
    assert "src/main.py" in paths
    assert "Dockerfile" in paths
    assert "docker-compose.yml" in paths
    assert ".github/workflows/ci.yml" in paths
    assert "Makefile" in paths
    assert "pyproject.toml" in paths
    assert "package.json" in paths
    assert "README.md" in paths
    assert "requirements.txt" in paths


def test_skips_binary_files_even_when_extension_whitelisted(tmp_path):
    """SBF-1 / B3 defense: a `.json` file that contains a NUL byte in the
    first 4 KB is treated as binary (e.g., a corrupted blob saved with a
    `.json` name) and skipped silently rather than blowing up UTF-8 decode."""
    z = tmp_path / "mixed.zip"
    with zipfile.ZipFile(z, "w") as zf:
        zf.writestr("good.json", b'{"k":1}')
        zf.writestr("bad.json", b'{"\x00":"binary"}')  # NUL in first bytes
        zf.writestr("real.py", b"x = 1\n")

    proc = ZipProcessor(max_entries=10)
    code_files, _ = proc.extract_and_process(z)
    paths = sorted(f.path.replace("\\", "/") for f in code_files)
    assert "good.json" in paths
    assert "real.py" in paths
    assert "bad.json" not in paths


def test_extra_extensions_env_var_extends_whitelist(tmp_path, monkeypatch):
    """SBF-1 / B3: operator can extend the whitelist via env var without a
    code change. Picked up by `_load_extension_overrides()` at import."""
    import importlib
    import app.services.zip_processor as zp

    monkeypatch.setenv("AI_ANALYSIS_EXTRA_EXTENSIONS", ".zig,.exotic")
    importlib.reload(zp)

    try:
        z = tmp_path / "exotic.zip"
        with zipfile.ZipFile(z, "w") as zf:
            zf.writestr("src/main.zig", b"pub fn main() void {}\n")
            zf.writestr("src/x.exotic", b"hello\n")

        proc = zp.ZipProcessor(max_entries=10)
        code_files, _ = proc.extract_and_process(z)
        paths = sorted(f.path.replace("\\", "/") for f in code_files)
        assert "src/main.zig" in paths
        assert "src/x.exotic" in paths
    finally:
        monkeypatch.delenv("AI_ANALYSIS_EXTRA_EXTENSIONS", raising=False)
        importlib.reload(zp)


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
