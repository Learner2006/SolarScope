#!/usr/bin/env bash
set -e

# SolarScope Development Launcher
echo "Starting SolarScope..."

# Trap to kill background processes on exit
trap 'kill $(jobs -p) 2>/dev/null || true' EXIT

# 1. Start FastAPI backend
echo "Starting FastAPI backend on http://127.0.0.1:8000..."
python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload &

# 2. Start Vite frontend
echo "Starting Vite frontend on http://localhost:5173..."
cd frontend
npm run dev &

# Wait for both processes
wait
