#!/usr/bin/env python3
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _run(command: list[str], cwd: Path) -> None:
    print(f"[precommit] $ {' '.join(command)}")
    subprocess.check_call(command, cwd=str(cwd))


def _staged_files(root: Path) -> list[Path]:
    result = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
        cwd=str(root),
        check=True,
        capture_output=True,
        text=True,
    )
    files: list[Path] = []
    for line in result.stdout.splitlines():
        relative = line.strip()
        if not relative:
            continue
        path = root / relative
        if path.exists():
            files.append(path)
    return files


def _needs_frontend_lint(paths: list[Path], root: Path) -> bool:
    for path in paths:
        relative = path.relative_to(root)
        if relative.parts and relative.parts[0] == "view":
            return True
    return False


def _python_files(paths: list[Path]) -> list[str]:
    return [str(path) for path in paths if path.suffix == ".py"]


def _powershell_command() -> str | None:
    return shutil.which("pwsh") or shutil.which("powershell.exe")


def _powershell_paths(paths: list[Path], command: str) -> list[str]:
    if command.lower().endswith(".exe") and os.name != "nt":
        wslpath = shutil.which("wslpath")
        if not wslpath:
            raise SystemExit("[precommit] wslpath was not found, but powershell.exe path conversion is required.")
        converted: list[str] = []
        for path in paths:
            result = subprocess.run(
                [wslpath, "-w", str(path)],
                check=True,
                capture_output=True,
                text=True,
            )
            converted.append(result.stdout.strip())
        return converted

    return [str(path) for path in paths]


def _validate_powershell(paths: list[Path]) -> None:
    ps_paths = [path for path in paths if path.suffix == ".ps1"]
    if not ps_paths:
        return

    command = _powershell_command()
    if not command:
        print("[precommit] skipping PowerShell syntax check because pwsh/powershell.exe was not found.")
        return

    parse_script = """param([string[]]$Paths)
$allErrors = @()
foreach ($path in $Paths) {
  $tokens = $null
  $errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($path, [ref]$tokens, [ref]$errors) | Out-Null
  if ($errors) {
    $allErrors += $errors
  }
}
if ($allErrors.Count -gt 0) {
  $allErrors | ForEach-Object { Write-Error $_.Message }
  exit 1
}
"""

    script_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile("w", suffix=".ps1", delete=False, encoding="utf-8") as handle:
            handle.write(parse_script)
            script_path = Path(handle.name)

        script_arg = _powershell_paths([script_path], command)[0]
        powershell_args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script_arg, *_powershell_paths(ps_paths, command)]
        _run([command, *powershell_args], cwd=_repo_root())
    finally:
        if script_path and script_path.exists():
            script_path.unlink()


def main() -> int:
    root = _repo_root()
    staged_paths = _staged_files(root)

    if not staged_paths:
        print("[precommit] no staged files; skipping.")
        return 0

    if _needs_frontend_lint(staged_paths, root):
        npm = shutil.which("npm")
        if not npm:
            raise SystemExit("[precommit] npm was not found, but staged changes include view/ files.")
        _run([npm, "run", "lint"], cwd=root / "view")

    python_files = _python_files(staged_paths)
    if python_files:
        _run([sys.executable, "-m", "py_compile", *python_files], cwd=root)

    _validate_powershell(staged_paths)

    print("[precommit] checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
