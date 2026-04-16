<h1 align="center">AI Dev Workbench CLI</h1>

<p align="center">
  <strong>Turn any intent into a structured, multi-agent development pipeline.</strong><br />
  PO · Planner · Dev · QA — each role on the best model, never one model doing everything.
</p>

<p align="center">
  <a href="https://github.com/CrOliX-AltF4/AI-Dev-Workbench-CLI/actions/workflows/ci.yml">
    <img src="https://github.com/CrOliX-AltF4/AI-Dev-Workbench-CLI/actions/workflows/ci.yml/badge.svg" alt="CI" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/CrOliX-AltF4/AI-Dev-Workbench-CLI?colorA=080f12&colorB=1fa669" alt="MIT License" />
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

- **Interactive TUI** — pipeline view, live step status, live elapsed timer, per-step model picker
- **Tabbed results screen** — Overview (QA verdict + metrics) · Files (arrow-key preview) · Plan (architecture + tasks)
- **Model Recommendation Engine** — scores every model on task-fit, cost, latency, context window, and complexity
- **4 LLM providers** — Groq · Gemini · Claude · OpenAI, all swappable per step
- **Retry + backoff** — JSON parse failures trigger a corrective multi-turn retry; rate limits use exponential backoff
- **Structured JSON output** — agents never produce prose; noise is eliminated at the source
- **Prompt caching** — system prompts cached automatically on Claude (cost reduction)
- **Run persistence** — every execution saved to `~/.aiwb/runs/` as JSON
- **History command** — tabular view of past runs with verdict, cost, tokens
- **Save generated files** — write Dev + `requirements.md` + `plan.md` to `./output/<run-id>/` with one keypress
- **Headless mode** (`--json`) — progress to stderr, full `PipelineRun` JSON to stdout; exit 1 on failure
- **Skip roles** (`--skip`) — bypass any agent (e.g. `--skip po,qa` for external PO/QA integration)
- **Inject PO output** (`--from-po`) — supply pre-computed PO JSON from a file or stdin; PO agent auto-skipped
- **Dry run** (`--dry`) — preview models, estimated tokens, and cost without making any LLM call

---

## Installation

```bash
git clone https://github.com/CrOliX-AltF4/AI-Dev-Workbench-CLI.git
cd AI-Dev-Workbench-CLI
```

```powershell
# Windows (PowerShell)
.\setup.ps1
```

```bash
# macOS / Linux
bash setup.sh
```

The setup script installs dependencies, builds the project, and registers `aiwb` so it works from any directory. **Restart your terminal after running it.**

**Requirements:** Node.js >= 20 · At least one LLM provider API key

---

## Usage

On first launch `aiwb` detects that no provider is configured and opens an interactive setup screen automatically. You can also run it explicitly at any time:

```bash
aiwb setup
```

Alternatively, drop a `.env` file in the directory where you run `aiwb`:

```bash
cp .env.example .env   # then fill in at least one key
aiwb
```

Or configure via the CLI directly:

```bash
aiwb config set groq.apiKey   <your-key>
aiwb config set gemini.apiKey <your-key>
```

> Generated files are saved to `./output/<run-id>/` relative to the directory where you run `aiwb`.

### All commands

```bash
aiwb                                        # interactive TUI (recommended)
aiwb setup                                  # configure API keys interactively
aiwb run "create a REST API"                # skip the prompt screen
aiwb run "create a REST API" --dry          # preview cost without running
aiwb run "create a REST API" --skip qa      # bypass the QA agent
aiwb run "create a REST API" --json         # headless: JSON to stdout, progress to stderr
aiwb run "create a REST API" --from-po po.json  # inject pre-computed PO output
aiwb history                                # browse past runs
aiwb config list                            # show current configuration
```

**Natsume / external PO+QA integration:**

```bash
echo '<po-json>' | aiwb run "intent" --skip po,qa --from-po - --json
```

### TUI controls

**Pipeline screen** — configure and launch the run:

| Key   | Action                                |
| ----- | ------------------------------------- |
| `↑ ↓` | Navigate between steps                |
| `m`   | Change the model for the focused step |
| `↵`   | Run the pipeline                      |
| `q`   | Quit                                  |

**Results screen** — tabs and actions:

| Key   | Action                                                   |
| ----- | -------------------------------------------------------- |
| `1`   | Overview tab — QA verdict, issues, suggestions, metrics  |
| `2`   | Files tab — generated file list with inline code preview |
| `3`   | Plan tab — architecture, tech stack, tasks, risks        |
| `↑ ↓` | Navigate files (Files tab)                               |
| `s`   | Save all files + `requirements.md` + `plan.md`           |
| `r`   | Start a new pipeline                                     |
| `q`   | Quit                                                     |

---

## Default model strategy

| Role    | Default model        | Rationale                           |
| ------- | -------------------- | ----------------------------------- |
| PO      | Llama 3.3 70B (Groq) | Fast clarification, free tier       |
| Planner | Gemini 2.5 Flash     | 1M context, strong reasoning, cheap |
| Dev     | Claude Sonnet 4.6    | Best code quality                   |
| QA      | Llama 3.3 70B (Groq) | Fast analysis, free tier            |

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
| Tests         | Vitest · 80 tests                                                     |
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
