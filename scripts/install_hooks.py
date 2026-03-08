#!/usr/bin/env python3
from __future__ import annotations

import argparse
import stat
import subprocess
import sys
from pathlib import Path


MANAGED_MARKER = "# Tullius Widgets managed pre-commit hook"
LEGACY_MARKERS = (
    'repo_root / ".vibe" / "brain"',
    "runpy.run_path",
    "precommit.py",
)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _hook_template() -> str:
    return f"""#!/usr/bin/env python3
{MANAGED_MARKER}
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

def _discover_repo_root() -> Path:
    result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        return Path(result.stdout.strip())
    return Path.cwd()

repo_root = _discover_repo_root()
hook_entrypoint = repo_root / "scripts" / "precommit.py"
raise SystemExit(subprocess.call([sys.executable, str(hook_entrypoint)], cwd=str(repo_root)))
"""


def _hooks_dir(root: Path) -> Path:
    result = subprocess.run(
        ["git", "rev-parse", "--git-path", "hooks"],
        cwd=str(root),
        check=True,
        capture_output=True,
        text=True,
    )
    return (root / result.stdout.strip()).resolve()


def _is_replaceable_hook(path: Path) -> bool:
    try:
        existing = path.read_text(encoding="utf-8")
    except OSError:
        return False

    if MANAGED_MARKER in existing:
        return True

    return all(marker in existing for marker in LEGACY_MARKERS)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Install git hooks for Tullius Widgets.")
    parser.add_argument("--force", action="store_true", help="Overwrite existing hooks.")
    args = parser.parse_args(argv)

    root = _repo_root()
    try:
        hooks_dir = _hooks_dir(root)
    except subprocess.CalledProcessError:
        print("[hooks] no git hooks directory found; skipping hook install.")
        return 0

    hooks_dir.mkdir(parents=True, exist_ok=True)
    precommit_path = hooks_dir / "pre-commit"

    if precommit_path.exists() and not args.force and not _is_replaceable_hook(precommit_path):
        print("[hooks] pre-commit hook already exists (use --force to overwrite).")
        return 0

    precommit_path.write_text(_hook_template(), encoding="utf-8", newline="\n")
    try:
        mode = precommit_path.stat().st_mode
        precommit_path.chmod(mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    except OSError:
        pass

    print(f"[hooks] installed: {precommit_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
