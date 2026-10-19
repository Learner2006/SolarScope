#!/usr/bin/env bash
set -e

echo "=== Running SolarScope Verification Suite ==="

echo ""
echo "[1/3] Running Backend Tests (pytest)..."
python3 -m pytest backend/tests

echo ""
echo "[2/3] Running Frontend Tests (vitest)..."
cd frontend
npm run test

echo ""
echo "[3/3] Type-checking & Building Frontend..."
npm run build

echo ""
echo "=== All Checks Passed Successfully! ==="
