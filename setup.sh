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
echo "  1. Configure at least one provider:"
echo "       aiwb config set groq.apiKey   <your-key>"
echo "       aiwb config set gemini.apiKey <your-key>"
echo "       aiwb config set claude.apiKey <your-key>"
echo "       aiwb config set openai.apiKey <your-key>"
echo "  2. Run: aiwb"
echo ""
