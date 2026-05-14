# ZIP File Processor for Static Analysis Service
import logging
import os
import tempfile
import zipfile
from pathlib import Path
from typing import List, Tuple, Optional, Set

from app.domain.schemas.requests import CodeFile, SupportedLanguage


logger = logging.getLogger(__name__)

# SBF-1 / B3: the legacy whitelist only covered 14 "first-class" mainstream
# source extensions. Real submissions also carry config (.yaml, .toml, .json),
# build manifests (package.json, requirements.txt, Cargo.toml, csproj),
# scripts (.sh, .ps1), markup (README.md), and run files (Dockerfile,
# Makefile, docker-compose.yml, CI configs). Off-topic detection (T5)
# depends on the AI seeing the *actual* project shape, not a Python subset.
#
# The categories below are split so config-driven overrides can extend any
# slice without rewriting the whole set. Override via env vars:
#   AI_ANALYSIS_EXTRA_EXTENSIONS=".kt,.swift,.zig"  (CSV, leading dot)
#   AI_ANALYSIS_EXTRA_FILENAMES="LICENSE,CODEOWNERS" (CSV, exact-match basenames)

# Mainstream source code — language detection works for all of these.
SOURCE_CODE_EXTENSIONS: Set[str] = {
    '.py', '.pyw',                          # Python
    '.js', '.mjs', '.cjs', '.jsx',          # JavaScript
    '.ts', '.tsx',                          # TypeScript
    '.cs',                                  # C#
    '.c', '.h',                             # C
    '.cpp', '.hpp', '.cc', '.cxx', '.hh',   # C++
    '.php',                                 # PHP
    '.java',                                # Java
    '.go',                                  # Go
    '.rs',                                  # Rust
    '.rb',                                  # Ruby
    '.kt', '.kts',                          # Kotlin
    '.swift',                               # Swift
    '.scala',                               # Scala
    '.lua',                                 # Lua
    '.dart',                                # Dart
    '.r',                                   # R
    '.m', '.mm',                            # Objective-C
    '.sh', '.bash', '.zsh',                 # Shell scripts
    '.ps1',                                 # PowerShell
    '.bat', '.cmd',                         # Windows batch
    '.sql',                                 # SQL
    '.vue',                                 # Vue SFC
    '.svelte',                              # Svelte
}

# Config / build / run files — language usually None; still relevant to grading.
CONFIG_EXTENSIONS: Set[str] = {
    '.yaml', '.yml',                        # YAML (CI configs, k8s, compose)
    '.toml',                                # Cargo, pyproject, poetry
    '.ini', '.cfg',                         # Generic config
    '.json', '.json5', '.jsonc',            # JSON variants
    '.xml',                                 # csproj, pom.xml, web.config
    '.csproj', '.sln', '.fsproj', '.vbproj',# .NET project files
    '.props', '.targets',                   # MSBuild
    '.gradle',                              # Gradle build scripts
    '.env',                                 # env files (CAUTION: scrubbed if contains secrets)
    '.editorconfig',                        # Editor config
    '.gitignore', '.dockerignore',          # ignore files
    '.gitattributes',                       # git attributes
    '.lock',                                # package-lock, Cargo.lock, etc.
    '.md', '.markdown', '.rst', '.txt',     # Docs / readmes (often the only spec)
}

# Files matched by EXACT basename (case-insensitive). Used for run-files
# that have no canonical extension (Dockerfile, Makefile, etc).
ANALYZABLE_FILENAMES: Set[str] = {
    'dockerfile',
    'docker-compose.yml',
    'docker-compose.yaml',
    'makefile',
    'rakefile',
    'gemfile',
    'gemfile.lock',
    'procfile',
    'vagrantfile',
    'cmakelists.txt',
    'requirements.txt',
    'requirements-dev.txt',
    'pipfile',
    'pipfile.lock',
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'cargo.toml',
    'cargo.lock',
    'go.mod',
    'go.sum',
    'pom.xml',
    'build.gradle',
    'build.gradle.kts',
    'settings.gradle',
    'pyproject.toml',
    'tsconfig.json',
    'jsconfig.json',
    'webpack.config.js',
    'vite.config.ts',
    'vite.config.js',
    'rollup.config.js',
    'next.config.js',
    'nuxt.config.ts',
    'tailwind.config.js',
    'postcss.config.js',
    'babel.config.js',
    '.babelrc',
    '.eslintrc',
    '.eslintrc.js',
    '.eslintrc.json',
    '.prettierrc',
    'license',
    'license.md',
    'license.txt',
    'readme',
    'readme.md',
    'changelog.md',
    'codeowners',
}


def _load_extension_overrides() -> Tuple[Set[str], Set[str]]:
    """Parse the two env-var CSV overrides (extra extensions, extra filenames).
    Lowercased; leading dot enforced for extensions; whitespace stripped.
    """
    extra_ext_raw = os.environ.get('AI_ANALYSIS_EXTRA_EXTENSIONS', '').strip()
    extra_name_raw = os.environ.get('AI_ANALYSIS_EXTRA_FILENAMES', '').strip()

    extra_exts: Set[str] = set()
    if extra_ext_raw:
        for tok in extra_ext_raw.split(','):
            tok = tok.strip().lower()
            if not tok:
                continue
            if not tok.startswith('.'):
                tok = '.' + tok
            extra_exts.add(tok)

    extra_names: Set[str] = set()
    if extra_name_raw:
        for tok in extra_name_raw.split(','):
            tok = tok.strip().lower()
            if tok:
                extra_names.add(tok)

    return extra_exts, extra_names


_extra_exts, _extra_names = _load_extension_overrides()

# The full effective analyzable set used by the runtime. Tests import this
# constant directly so they can introspect what's allowed without re-parsing
# env vars.
ANALYZABLE_EXTENSIONS: Set[str] = (
    SOURCE_CODE_EXTENSIONS | CONFIG_EXTENSIONS | _extra_exts
)

ANALYZABLE_BASENAMES: Set[str] = ANALYZABLE_FILENAMES | _extra_names


# Directories to skip during extraction — dependency / build / IDE noise that
# would only burn token budget without informing the AI's grade.
SKIP_DIRECTORIES = {
    '.git',
    '__pycache__',
    'node_modules',
    '.venv',
    'venv',
    'env',
    '.env.d',          # mkdocs material
    '.idea',
    '.vscode',
    '.vs',
    'dist',
    'build',
    'out',
    'bin',
    'obj',             # .NET
    'target',          # Rust / Java
    '.pytest_cache',
    '.mypy_cache',
    '.ruff_cache',
    '.tox',
    '.nyc_output',
    'coverage',
    '.coverage',
    '.next',
    '.nuxt',
    '.svelte-kit',
    '.cache',
    '.parcel-cache',
    'vendor',          # Go / PHP composer
    'Pods',            # iOS
    '.gradle',
    '.dart_tool',
    '.terraform',
    '.serverless',
}


def _is_analyzable_path(file_path: Path) -> bool:
    """True if the path matches either the extension whitelist or the
    exact-basename whitelist (case-insensitive)."""
    name_lower = file_path.name.lower()
    if name_lower in ANALYZABLE_BASENAMES:
        return True
    suffix = file_path.suffix.lower()
    if suffix and suffix in ANALYZABLE_EXTENSIONS:
        return True
    return False


def _looks_binary(payload: bytes, sample_size: int = 4096) -> bool:
    """Cheap binary sniff — a NUL byte in the first 4 KB is a strong signal
    the file is binary (text source never contains NULs). Used as a defense
    against expanded whitelists accidentally grabbing PNGs / fonts / .pyc
    that happen to live next to source.
    """
    sample = payload[:sample_size]
    return b'\x00' in sample


class ZipProcessor:
    """Process ZIP files for static analysis."""

    def __init__(
        self,
        max_file_size: int = 2 * 1024 * 1024,       # SBF-1 / B3: 1MB → 2MB per-file default
        max_entries: int = 500,                      # S5-T8: total ZIP entries cap
        max_uncompressed_bytes: int = 200 * 1024 * 1024,  # S5-T8: ZIP-bomb defense
    ):
        self.max_file_size = max_file_size
        self.max_entries = max_entries
        self.max_uncompressed_bytes = max_uncompressed_bytes

    def extract_and_process(self, zip_path: Path) -> Tuple[List[CodeFile], str]:
        """
        Extract ZIP file and return list of CodeFile objects.

        Args:
            zip_path: Path to the ZIP file

        Returns:
            Tuple of (list of CodeFile objects, project name)

        Raises:
            ValueError: invalid ZIP or structural limit exceeded (too many entries,
                uncompressed size too large).
        """
        code_files: List[CodeFile] = []

        # Get project name from ZIP filename
        project_name = zip_path.stem

        try:
            with zipfile.ZipFile(zip_path, 'r') as zf:
                infolist = zf.infolist()

                # B-039 / SBF-1: count only entries that would actually be analyzed.
                # The expanded whitelist (incl. .yaml, Dockerfile, README) means the
                # cap counts what the AI will really see, not raw ZIP entries.
                relevant_count = sum(
                    1 for i in infolist
                    if not i.is_dir()
                    and not self._should_skip_path(Path(i.filename))
                    and _is_analyzable_path(Path(i.filename))
                )
                if relevant_count > self.max_entries:
                    raise ValueError(
                        f"ZIP has too many analyzable entries: {relevant_count} > max {self.max_entries}"
                    )

                # S5-T8: ZIP-bomb defense — sum declared uncompressed sizes up
                # front. Includes skipped/non-analyzable entries by design;
                # an attacker shouldn't be able to bypass the size cap by
                # claiming files are `.git/` or `.txt`.
                declared_uncompressed = sum(i.file_size for i in infolist if not i.is_dir())
                if declared_uncompressed > self.max_uncompressed_bytes:
                    raise ValueError(
                        f"ZIP uncompressed size too large: {declared_uncompressed} > max {self.max_uncompressed_bytes}"
                    )

                for file_info in infolist:
                    # Skip directories
                    if file_info.is_dir():
                        continue

                    file_path = Path(file_info.filename)

                    # Skip files in ignored directories
                    if self._should_skip_path(file_path):
                        logger.debug(f"Skipping: {file_path}")
                        continue

                    # Check if file is analyzable (extension OR exact basename)
                    if not _is_analyzable_path(file_path):
                        continue

                    # Check per-file size
                    if file_info.file_size > self.max_file_size:
                        logger.warning(f"Skipping large file: {file_path} ({file_info.file_size} bytes)")
                        continue

                    # Read file content
                    try:
                        raw = zf.read(file_info.filename)
                        if _looks_binary(raw):
                            logger.debug(f"Skipping binary file: {file_path}")
                            continue
                        content = raw.decode('utf-8')

                        # Detect language from extension (None for non-source files)
                        language = self._detect_language(file_path.suffix)

                        code_files.append(CodeFile(
                            path=str(file_path),
                            content=content,
                            language=language
                        ))

                        logger.info(f"Extracted: {file_path} ({language or 'config/text'})")

                    except UnicodeDecodeError:
                        logger.warning(f"Could not decode file: {file_path}")
                    except Exception as e:
                        logger.error(f"Error reading file {file_path}: {e}")

            logger.info(f"Extracted {len(code_files)} files from {project_name}")
            return code_files, project_name

        except zipfile.BadZipFile:
            logger.error(f"Invalid ZIP file: {zip_path}")
            raise ValueError("Invalid ZIP file")
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to process ZIP: {e}")
            raise

    def _should_skip_path(self, file_path: Path) -> bool:
        """Skip an entry only if a path component matches SKIP_DIRECTORIES.

        Hidden directories that aren't on the skip list (`.github/`,
        `.devcontainer/`, `.husky/`) are intentionally allowed — they carry
        CI configs and dev-experience scripts the AI should see. Hidden
        files (`.eslintrc`, `.gitignore`) are gated by `_is_analyzable_path`
        which checks the basename whitelist.
        """
        for part in file_path.parts:
            if part.lower() in SKIP_DIRECTORIES:
                return True
        return False

    def _detect_language(self, extension: str) -> Optional[SupportedLanguage]:
        """Detect language from file extension. Returns None for files
        outside the SupportedLanguage enum (config / yaml / markdown / etc.) —
        those still get extracted so the AI sees the full project shape,
        but downstream static analyzers (Bandit, ESLint…) won't run on them.
        """
        extension = extension.lower()
        language_map = {
            '.py': SupportedLanguage.PYTHON,
            '.pyw': SupportedLanguage.PYTHON,
            '.js': SupportedLanguage.JAVASCRIPT,
            '.mjs': SupportedLanguage.JAVASCRIPT,
            '.cjs': SupportedLanguage.JAVASCRIPT,
            '.ts': SupportedLanguage.TYPESCRIPT,
            '.jsx': SupportedLanguage.JAVASCRIPT,
            '.tsx': SupportedLanguage.TYPESCRIPT,
            '.cs': SupportedLanguage.CSHARP,
            '.c': SupportedLanguage.C,
            '.h': SupportedLanguage.C,
            '.cpp': SupportedLanguage.CPP,
            '.hpp': SupportedLanguage.CPP,
            '.cc': SupportedLanguage.CPP,
            '.cxx': SupportedLanguage.CPP,
            '.hh': SupportedLanguage.CPP,
            '.php': SupportedLanguage.PHP,
            '.java': SupportedLanguage.JAVA,
        }
        return language_map.get(extension)
