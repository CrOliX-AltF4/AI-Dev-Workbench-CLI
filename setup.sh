#!/usr/bin/env bash
# AI Dev Workbench CLI — macOS/Linux setup script
# Run once from the project folder: bash setup.sh

set -e

echo ""
echo "AI Dev Workbench CLI — setup"
echo "-----------------------------"

echo "Installing dependencies..."
npm install

echo "Building..."
npm run build

echo "Registering aiwb globally..."
npm link

echo ""
echo "✓ Setup complete. Next steps:"
echo "  1. Run: aiwb"
echo "     (first launch opens an interactive key setup screen)"
echo "     Or create a .env file with your API keys — see .env.example"
echo ""
