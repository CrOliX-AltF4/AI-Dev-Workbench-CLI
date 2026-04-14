# AI Dev Workbench CLI

> Open-source AI-powered development orchestration CLI — turns an intent into a structured, traceable pipeline.

[![CI](https://github.com/<org>/ai-dev-workbench-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/<org>/ai-dev-workbench-cli/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/ai-dev-workbench-cli)](https://www.npmjs.com/package/ai-dev-workbench-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >=20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

---

## Overview

**AI Dev Workbench CLI** (`aiwb`) is an AI-assisted development orchestrator that:

- Turns a user intent into a **structured pipeline**: `PO → Planner → Dev → QA`
- Automatically selects the **best LLM model** for each step (cost, quality, latency)
- Stays **non-autonomous**: human control is preserved at every step, with manual override
- Stores every execution as a **reproducible run**

## Architecture

```
User intent
    ↓
Orchestrator
    ↓
┌─────────────────────────────────────┐
│           Pipeline Engine           │
│  PO → Planner → Dev → QA           │
└─────────────────────────────────────┘
    ↓
Model Recommendation Engine
(automatic selection by role + complexity)
    ↓
LLM Providers
(Groq · Gemini · Claude · OpenAI)
    ↓
Storage (reproducible runs)
```

## Features

- **Clean TUI interface** for prompting and pipeline navigation
- **Model Recommendation Engine**: model selection by role, cost, complexity, and latency
- **Real-time metrics**: costs, tokens, latency, CPU/RAM
- **Per-step model override** by the user
- **Run replay** from history
- **Deterministic, traceable pipeline**

## Installation

```bash
npm install -g ai-dev-workbench-cli
```

Or run without installing:

```bash
npx ai-dev-workbench-cli
```

## Requirements

- Node.js >= 20
- At least one LLM provider configured (Groq, Gemini, Claude, OpenAI)

## Quick start

```bash
# Run a pipeline
aiwb run "create a REST API to manage users"

# Browse run history
aiwb history

# Replay a previous run
aiwb replay <run-id>
```

## Configuration

```bash
aiwb config set groq.apiKey <your-key>
aiwb config set claude.apiKey <your-key>
```

## Tech stack

| Area     | Tech                              |
| -------- | --------------------------------- |
| Language | TypeScript 5 strict               |
| Runtime  | Node.js 20+ (ESM)                 |
| CLI      | Commander.js                      |
| TUI      | Ink (React for CLI)               |
| Tests    | Vitest                            |
| Lint     | ESLint v9 + typescript-eslint     |
| Format   | Prettier                          |
| Commits  | Conventional Commits + commitlint |
| CI       | GitHub Actions                    |

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

```bash
git clone https://github.com/<org>/ai-dev-workbench-cli.git
cd ai-dev-workbench-cli
npm install
npm run dev
```

## License

[MIT](LICENSE)
