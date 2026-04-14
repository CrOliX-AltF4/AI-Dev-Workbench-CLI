# AI Dev Workbench CLI

> Open-source AI-powered development orchestration CLI — transforme une intention en pipeline structuré et traçable.

[![CI](https://github.com/<org>/ai-dev-workbench-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/<org>/ai-dev-workbench-cli/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/ai-dev-workbench-cli)](https://www.npmjs.com/package/ai-dev-workbench-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js ≥ 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

---

## Vue d'ensemble

**AI Dev Workbench CLI** (`aiwb`) est un orchestrateur de développement assisté par IA qui :

- Transforme une intention utilisateur en **pipeline structuré** : `PO → Planner → Dev → QA`
- Sélectionne automatiquement le **meilleur modèle LLM** pour chaque étape (coût, qualité, latence)
- Reste **non-autonome** : contrôle humain conservé à chaque étape, override possible
- Stocke chaque exécution sous forme de **run reproductible**

## Architecture

```
Input utilisateur
      ↓
  Orchestrateur
      ↓
┌─────────────────────────────────────┐
│           Pipeline Engine           │
│  PO → Planner → Dev → QA           │
└─────────────────────────────────────┘
      ↓
Model Recommendation Engine
(sélection automatique par rôle + complexité)
      ↓
Providers LLM
(Groq · Gemini · Claude · OpenAI)
      ↓
Storage (runs reproductibles)
```

## Fonctionnalités

- **Interface TUI** propre pour le promptage et la navigation
- **Model Recommendation Engine** : choix du modèle par rôle, coût, complexité, latence
- **Metrics en temps réel** : coûts, tokens, latence, CPU/RAM
- **Override manuel** du modèle par étape
- **Replay** d'exécution depuis l'historique
- **Pipeline déterministe** et traçable

## Installation

```bash
npm install -g ai-dev-workbench-cli
```

Ou en utilisation locale :

```bash
npx ai-dev-workbench-cli
```

## Prérequis

- Node.js ≥ 20
- Au moins un provider LLM configuré (Groq, Gemini, Claude, OpenAI)

## Démarrage rapide

```bash
# Lancer un pipeline
aiwb run "créer une API REST pour gérer des utilisateurs"

# Voir l'historique des runs
aiwb history

# Rejouer un run précédent
aiwb replay <run-id>
```

## Configuration

```bash
# Configurer un provider
aiwb config set groq.apiKey <votre-clé>
aiwb config set claude.apiKey <votre-clé>
```

## Stack technique

| Domaine  | Techno                            |
| -------- | --------------------------------- |
| Language | TypeScript 5 strict               |
| Runtime  | Node.js 20+ (ESM)                 |
| CLI      | Commander.js                      |
| TUI      | Ink (React pour CLI)              |
| Tests    | Vitest                            |
| Lint     | ESLint v9 + typescript-eslint     |
| Format   | Prettier                          |
| Commits  | Conventional Commits + commitlint |
| CI       | GitHub Actions                    |

## Contribuer

Les contributions sont les bienvenues ! Consulte [CONTRIBUTING.md](CONTRIBUTING.md) pour démarrer.

```bash
git clone https://github.com/<org>/ai-dev-workbench-cli.git
cd ai-dev-workbench-cli
npm install
npm run dev
```

## Licence

[MIT](LICENSE)
