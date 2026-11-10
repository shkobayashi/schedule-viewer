#!/usr/bin/env python3
"""Issue #543 MCP GUI 統合試験のエントリ。"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    result = subprocess.run(
        ["cargo", "test", "--locked", "--test", "mcp_running_app"],
        cwd=ROOT / "src-tauri",
    )
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
