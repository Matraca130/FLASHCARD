import importlib
import sys
from pathlib import Path

# Ensure the real backend package location is on the path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Import the actual backend package
_real_pkg = importlib.import_module("backend.backend_app")

# Expose submodules under the 'backend_app' namespace
prefix = "backend.backend_app."
for name, module in list(sys.modules.items()):
    if name.startswith(prefix):
        sys.modules[name.replace(prefix, "backend_app.")] = module

# Replace this module with the real package
sys.modules[__name__] = _real_pkg
