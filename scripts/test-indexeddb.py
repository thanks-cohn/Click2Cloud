"""Compatibility entrypoint: the current browser suite includes real IndexedDB,
legacy-main migration, atomic revisions and encrypted restore checks."""
from pathlib import Path
import subprocess
root = Path(__file__).resolve().parents[1]
subprocess.run(["node", str(root / "scripts/test-product-browser.mjs")], cwd=root, check=True)
