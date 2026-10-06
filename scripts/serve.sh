#!/bin/sh
# Resolve the project directory even when called from another working directory.
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
exec python3 -u -m http.server "${PORT:-8000}" --bind 0.0.0.0 --directory "$project_dir"
