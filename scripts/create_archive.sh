#!/usr/bin/env bash
# SolarScope Safe Source Distribution Archiver
# Safely bundles the codebase while strictly excluding secrets (.env), macOS metadata (__MACOSX, .DS_Store),
# build outputs (frontend/dist), and developer caches.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_FILE="${1:-"$REPO_ROOT/SolarScope_clean_source.zip"}"

echo "=== Creating Safe Clean Source Archive ==="
echo "Target: $OUTPUT_FILE"

cd "$REPO_ROOT"

# Remove existing target if present
rm -f "$OUTPUT_FILE"

# Use git archive if git is present and clean; otherwise use zip with strict exclusions
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Using git archive with .gitattributes exclusions..."
    git archive --format=zip --output="$OUTPUT_FILE" HEAD
else
    echo "Using zip with strict exclusion patterns..."
    zip -r "$OUTPUT_FILE" . \
        -x "*.git*" \
        -x "*.env" \
        -x "*.env.local" \
        -x "*.env.*.local" \
        -x "*__MACOSX*" \
        -x "*.DS_Store*" \
        -x "*._*" \
        -x "*frontend/dist/*" \
        -x "*node_modules/*" \
        -x "*.pytest_cache/*" \
        -x "*.mypy_cache/*" \
        -x "*__pycache__/*" \
        -x "*.pyc"
fi

echo "Verifying archive contents for credentials and metadata leaks..."
if unzip -l "$OUTPUT_FILE" | grep -E "((^|/)\.env($|\.local)|\.DS_Store|__MACOSX|node_modules|frontend/dist)" ; then
    echo "ERROR: Disallowed files found in archive!"
    exit 1
else
    echo "Verification passed: No secrets, OS metadata, or build artifacts present in archive."
    echo "Clean source archive successfully created at: $OUTPUT_FILE"
fi
