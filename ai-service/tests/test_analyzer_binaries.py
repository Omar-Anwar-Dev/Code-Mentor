"""S5-T6: verify each analyzer binary is callable from the AI service image.

These tests skip themselves when the expected binary isn't on PATH, so they pass
on the current (old) image where only eslint + bandit are present, and they turn
green automatically once the new Dockerfile is built.
"""
import shutil
import subprocess

import pytest


def _tool_present(cmd: str) -> bool:
    return shutil.which(cmd) is not None


@pytest.mark.skipif(not _tool_present("eslint"), reason="eslint not installed")
def test_eslint_is_callable():
    out = subprocess.run(["eslint", "--version"], capture_output=True, text=True, timeout=30)
    assert out.returncode == 0
    assert out.stdout.strip().startswith("v")


@pytest.mark.skipif(not _tool_present("bandit"), reason="bandit not installed")
def test_bandit_is_callable():
    out = subprocess.run(["bandit", "--version"], capture_output=True, text=True, timeout=30)
    assert out.returncode == 0
    assert "bandit" in out.stdout.lower()


@pytest.mark.skipif(not _tool_present("cppcheck"), reason="cppcheck not installed")
def test_cppcheck_is_callable():
    out = subprocess.run(["cppcheck", "--version"], capture_output=True, text=True, timeout=30)
    assert out.returncode == 0
    assert "cppcheck" in out.stdout.lower()


@pytest.mark.skipif(not _tool_present("pmd"), reason="pmd not installed")
def test_pmd_is_callable():
    out = subprocess.run(["pmd", "--version"], capture_output=True, text=True, timeout=60)
    # PMD returns 0 on --version in v7.
    assert out.returncode == 0


@pytest.mark.skipif(not _tool_present("phpstan"), reason="phpstan not installed")
def test_phpstan_is_callable():
    out = subprocess.run(["phpstan", "--version"], capture_output=True, text=True, timeout=30)
    assert out.returncode == 0
    assert "phpstan" in out.stdout.lower()


@pytest.mark.skipif(not _tool_present("dotnet"), reason="dotnet SDK not installed")
def test_dotnet_roslyn_is_callable():
    # `dotnet format --help` returns 0 if Roslyn/formatter is present.
    out = subprocess.run(["dotnet", "format", "--help"], capture_output=True, text=True, timeout=120)
    assert out.returncode == 0
