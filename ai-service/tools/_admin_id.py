"""Shared admin-GUID resolver for the sprint content/task/question batch
runners.

History: S17 / S18 / S21 runners originally hardcoded the placeholder
``11111111-1111-1111-1111-111111111111`` as the ``ApprovedById`` value on
emitted ``INSERT INTO Questions`` / ``INSERT INTO Tasks`` SQL. That GUID
is not a real user, so applying the SQL via ``sqlcmd`` triggered
``FK_Questions_Users_ApprovedById`` (and the equivalent ``FK_Tasks_...``)
errors and required a manual sweep-replace before each apply. S19 and S20
fixed it locally by hardcoding the real admin GUID. This module
centralises the resolution so every runner picks up the same value and
operators can override it without editing source.

Resolution order:
1. ``--admin-id <guid>`` CLI argument (callers pass it in explicitly).
2. ``CODEMENTOR_ADMIN_USER_ID`` environment variable.
3. The canonical local-dev admin: ``admin@codementor.local`` →
   ``765E1668-44D3-4E11-AF1A-589A2274B311``.

The fallback matches the seeded user `DemoSeeder` creates on a fresh
local DB, so the default-path keeps working out of the box for new
machines that follow the standard setup. Operators with a different
admin GUID (production-ish DBs, alternative seed sets) set the env var
before running the script.
"""
from __future__ import annotations

import os
import re
from typing import Optional

# Canonical local-dev admin user — matches the seed in
# `backend/src/CodeMentor.Infrastructure/Persistence/DemoSeeder.cs`.
_DEFAULT_ADMIN_USER_ID = "765E1668-44D3-4E11-AF1A-589A2274B311"

_GUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)


def resolve_admin_id(cli_value: Optional[str] = None) -> str:
    """Return the admin GUID used as ``ApprovedById`` in emitted SQL.

    Args:
        cli_value: optional value coming from a ``--admin-id`` argparse
            argument. Takes precedence over the env var and default.

    Returns:
        A validated lowercase-or-uppercase GUID string suitable for
        direct interpolation into the SQL template strings used by the
        runners.

    Raises:
        ValueError: if the resolved value is not a valid GUID. Runner
            scripts should let this propagate and exit non-zero.
    """
    raw = cli_value or os.environ.get("CODEMENTOR_ADMIN_USER_ID") or _DEFAULT_ADMIN_USER_ID
    raw = raw.strip()
    if not _GUID_RE.match(raw):
        raise ValueError(
            f"Resolved admin user id is not a valid GUID: {raw!r}. "
            "Set CODEMENTOR_ADMIN_USER_ID or pass --admin-id <guid>."
        )
    return raw


def add_admin_id_argument(parser) -> None:
    """Helper: register the standard ``--admin-id`` argument on an
    argparse parser. Optional — runners that don't use argparse can
    just call ``resolve_admin_id()`` directly.
    """
    parser.add_argument(
        "--admin-id",
        dest="admin_id",
        default=None,
        help=(
            "GUID of the admin user that will own the emitted INSERTs as "
            "ApprovedById. Falls back to the CODEMENTOR_ADMIN_USER_ID env "
            f"var, then to the default seed admin ({_DEFAULT_ADMIN_USER_ID})."
        ),
    )
