# ZIP File Processor for Static Analysis Service
import logging
import tempfile
import zipfile
from pathlib import Path
from typing import List, Tuple, Optional

from app.domain.schemas.requests import CodeFile, SupportedLanguage


logger = logging.getLogger(__name__)

# File extensions to analyze
ANALYZABLE_EXTENSIONS = {
    '.py',    # Python
    '.js',    # JavaScript
    '.ts',    # TypeScript
    '.jsx',   # React JSX
    '.tsx',   # React TSX
    '.cs',    # C#
    '.c',     # C
    '.h',     # C header
    '.cpp',   # C++
    '.hpp',   # C++ header
    '.cc',    # C++
    '.cxx',   # C++
    '.php',   # PHP
    '.java',  # Java
}

# Directories to skip during extraction
SKIP_DIRECTORIES = {
    '.git',
    '__pycache__',
    'node_modules',
    '.venv',
    'venv',
    '.idea',
    '.vscode',
    'dist',
    'build',
    '.pytest_cache',
    '.mypy_cache',
}


class ZipProcessor:
    """Process ZIP files for static analysis."""

    def __init__(
        self,
        max_file_size: int = 1024 * 1024,       # 1MB per-file default
        max_entries: int = 500,                  # S5-T8: total ZIP entries cap
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

                # B-039: count only entries that would actually be analyzed. The
                # raw `non_dir_count` rejected legitimate multi-service repos
                # whose `.git/`, `node_modules/`, and build-artifact entries
                # blew past the cap even though `_should_skip_path` +
                # ANALYZABLE_EXTENSIONS would have filtered them downstream.
                # The ZIP-bomb defense below still uses the full uncompressed
                # total so size-based attacks remain blocked regardless of
                # extension or directory.
                relevant_count = sum(
                    1 for i in infolist
                    if not i.is_dir()
                    and not self._should_skip_path(Path(i.filename))
                    and Path(i.filename).suffix.lower() in ANALYZABLE_EXTENSIONS
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

                    # Check if file is analyzable
                    if file_path.suffix.lower() not in ANALYZABLE_EXTENSIONS:
                        continue

                    # Check per-file size
                    if file_info.file_size > self.max_file_size:
                        logger.warning(f"Skipping large file: {file_path} ({file_info.file_size} bytes)")
                        continue

                    # Read file content
                    try:
                        content = zf.read(file_info.filename).decode('utf-8')

                        # Detect language from extension
                        language = self._detect_language(file_path.suffix)

                        code_files.append(CodeFile(
                            path=str(file_path),
                            content=content,
                            language=language
                        ))

                        logger.info(f"Extracted: {file_path} ({language})")

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
        """Check if the file path should be skipped."""
        for part in file_path.parts:
            if part in SKIP_DIRECTORIES:
                return True
            # Skip hidden files/directories (starting with .)
            if part.startswith('.') and part not in {'.py', '.js', '.ts'}:
                return True
        return False
    
    def _detect_language(self, extension: str) -> Optional[SupportedLanguage]:
        """Detect language from file extension."""
        extension = extension.lower()
        language_map = {
            '.py': SupportedLanguage.PYTHON,
            '.js': SupportedLanguage.JAVASCRIPT,
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
            '.php': SupportedLanguage.PHP,
            '.java': SupportedLanguage.JAVA,
        }
        return language_map.get(extension)
