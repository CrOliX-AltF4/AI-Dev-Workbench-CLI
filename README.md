<h1 align="center">AI Dev Workbench CLI</h1>

<p align="center">
  <strong>Turn any intent into a structured, multi-agent development pipeline.</strong><br />
  PO · Planner · Dev · QA — each role on the best model, never one model doing everything.
</p>

<p align="center">
  <a href="https://github.com/CrOliX-AltF4/AI-Dev-Workbench-CLI/actions/workflows/ci.yml">
    <img src="https://github.com/CrOliX-AltF4/AI-Dev-Workbench-CLI/actions/workflows/ci.yml/badge.svg" alt="CI" />
  </a>
  <a href="https://codecov.io/gh/CrOliX-AltF4/AI-Dev-Workbench-CLI">
    <img src="https://codecov.io/gh/CrOliX-AltF4/AI-Dev-Workbench-CLI/branch/main/graph/badge.svg" alt="Coverage" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/CrOliX-AltF4/AI-Dev-Workbench-CLI?colorA=080f12&colorB=1fa669" alt="MIT License" />
  </a>
  <a href="https://www.npmjs.com/package/ai-dev-workbench-cli">
    <img src="https://img.shields.io/npm/v/ai-dev-workbench-cli?colorA=080f12&colorB=1fa669" alt="npm version" />
  </a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen?colorA=080f12" alt="Node.js >=20" />
  <img src="https://img.shields.io/badge/TypeScript-strict-blue?colorA=080f12" alt="TypeScript strict" />
</p>

---

## Why

A single LLM context doing PO + architecture + code + QA at once loses quality fast.  
`aiwb` splits each responsibility across dedicated agents — each on the model best suited for that task — and passes only the information the next agent needs (no full-history pollution).

| Problem with a single LLM       | How `aiwb` addresses it                                    |
| ------------------------------- | ---------------------------------------------------------- |
| Context overload → quality loss | One model per role, selective context passing              |
| No cost control                 | Model Recommendation Engine scores cost, latency, task-fit |
| Untraceable output              | Every run is persisted, every step is logged               |
| All-or-nothing execution        | Step-level status, per-step model override before run      |

---

## Pipeline

```
╔══════════════════════════════════════════════════════╗
║  User intent: "build a REST API to manage users"     ║
╚══════════════════╦═══════════════════════════════════╝
                   ▼
        ┌─────────────────────┐
        │   Product Owner     │  Clarifies goal, requirements,
        │   (fast, cheap)     │  constraints, complexity
        └──────────┬──────────┘
                   ▼  [requirements, complexity]
        ┌─────────────────────┐
        │      Planner        │  Architecture, tech stack,
        │   (large context)   │  task breakdown, risks
        └──────────┬──────────┘
                   ▼  [architecture, tasks]
        ┌─────────────────────┐
        │     Developer       │  Generates complete,
        │   (best at code)    │  production-ready files
        └──────────┬──────────┘
                   ▼  [code, entry points]
        ┌─────────────────────┐
        │    QA Engineer      │  Audits against requirements,
        │   (fast, precise)   │  verdict + score + issues
        └──────────┬──────────┘
                   ▼
        ╔══════════════════════╗
        ║  Results + save      ║
        ╚══════════════════════╝
```

Each arrow carries only the **typed slice** the next agent needs — not the full upstream history.

---

## Features

- **Interactive TUI** — pipeline view, live step status, spinner, per-step model picker
- **Model Recommendation Engine** — scores every model on task-fit, cost, latency, context window, and complexity
- **4 LLM providers** — Groq · Gemini · Claude · OpenAI, all swappable per step
- **Structured JSON output** — agents never produce prose; noise is eliminated at the source
- **Prompt caching** — system prompts cached automatically on Claude (cost reduction)
- **Run persistence** — every execution saved to `~/.aiwb/runs/` as JSON
- **History command** — tabular view of past runs with verdict, cost, tokens
- **Save generated files** — write Dev output to `./output/<run-id>/` with one keypress

---

## Installation

```bash
npm install -g ai-dev-workbench-cli
```

Or run without installing:

```bash
npx ai-dev-workbench-cli
```

**Requirements:** Node.js >= 20 · At least one LLM provider API key

---

## Quick start

```bash
# Interactive mode — TUI with prompt screen
aiwb

# Run a pipeline directly
aiwb run "create a REST API to manage users"

# Browse past runs
aiwb history
```

---

## Configuration

```bash
# Set API keys
aiwb config set groq.apiKey     <your-key>
aiwb config set gemini.apiKey   <your-key>
aiwb config set claude.apiKey   <your-key>
aiwb config set openai.apiKey   <your-key>

# List current configuration
aiwb config list
```

API keys are stored in `~/.aiwb/config.json`. You only need to configure the providers you want to use — the pipeline adapts to whichever are available.

---

## Default model strategy

| Role    | Default model        | Rationale                         |
| ------- | -------------------- | --------------------------------- |
| PO      | Llama 3.3 70B (Groq) | Fast clarification, cheap         |
| Planner | Gemini 2.0 Flash     | 1M token context for architecture |
| Dev     | Claude Sonnet 4.5    | Best code quality                 |
| QA      | Llama 3.3 70B (Groq) | Fast analysis, cheap              |

Every model can be changed before running via the TUI model picker (`m` key).

---

## Tech stack

| Area          | Tech                                                                  |
| ------------- | --------------------------------------------------------------------- |
| Language      | TypeScript 5 · strict mode                                            |
| Runtime       | Node.js 20+ · native ESM                                              |
| CLI           | Commander.js                                                          |
| TUI           | Ink (React for terminals)                                             |
| LLM providers | `@anthropic-ai/sdk` · `@google/generative-ai` · `groq-sdk` · `openai` |
| Tests         | Vitest · 53 tests                                                     |
| Lint / Format | ESLint v9 + typescript-eslint · Prettier                              |
| Commits       | Conventional Commits + commitlint                                     |
| CI            | GitHub Actions                                                        |

---

## Architecture

```
src/
├── cli/           # Commander.js entry — run, history, config commands
├── ui/            # TUI screens: Prompt → Pipeline → Results
├── orchestrator/  # Public façade — the stable entry point for callers
├── agents/        # Stateless agents: PO · Planner · Dev · QA
├── pipeline/      # Sequential runner + selective context mappers
├── models/        # Model catalog + recommendation engine
├── providers/     # LLM adapters: Groq · Gemini · Claude · OpenAI
├── storage/       # Run persistence (JSON → ~/.aiwb/runs/)
└── types/         # Shared TypeScript types
```

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow, commit conventions, and code standards.

```bash
git clone https://github.com/CrOliX-AltF4/AI-Dev-Workbench-CLI.git
cd AI-Dev-Workbench-CLI
npm install
npm run dev
```

---

## License

[MIT](LICENSE) © 2026 CrOliX-AltF4
