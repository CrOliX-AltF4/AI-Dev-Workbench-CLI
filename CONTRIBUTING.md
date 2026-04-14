# Contributing to AI Dev Workbench CLI

Merci de contribuer ! Ce guide te permettra de démarrer rapidement et de t'assurer que ta contribution s'intègre bien dans le projet.

## Table des matières

- [Code de conduite](#code-de-conduite)
- [Démarrage rapide](#démarrage-rapide)
- [Structure du projet](#structure-du-projet)
- [Workflow de contribution](#workflow-de-contribution)
- [Conventions de commit](#conventions-de-commit)
- [Standards de code](#standards-de-code)
- [Tests](#tests)
- [Soumettre une PR](#soumettre-une-pr)

---

## Code de conduite

Ce projet adhère au [Contributor Covenant](https://www.contributor-covenant.org/). En contribuant, tu acceptes d'en respecter les termes.

---

## Démarrage rapide

### Prérequis

- **Node.js** ≥ 20 (voir `.nvmrc`)
- **npm** ≥ 10
- Git

### Installation

```bash
git clone https://github.com/<org>/ai-dev-workbench-cli.git
cd ai-dev-workbench-cli
npm install
```

Les hooks Git (pre-commit, commit-msg) sont installés automatiquement via Husky lors du `npm install`.

### Commandes disponibles

| Commande                | Description                             |
| ----------------------- | --------------------------------------- |
| `npm run dev`           | Lancer en mode développement            |
| `npm run build`         | Compiler TypeScript → `dist/`           |
| `npm run typecheck`     | Vérification des types sans compilation |
| `npm run lint`          | ESLint sur tout le projet               |
| `npm run lint:fix`      | Lint + autofix                          |
| `npm run format`        | Prettier sur tout le projet             |
| `npm run format:check`  | Vérification du formatage               |
| `npm test`              | Lancer les tests une fois               |
| `npm run test:watch`    | Tests en mode watch                     |
| `npm run test:coverage` | Tests + rapport de couverture           |

---

## Structure du projet

```
src/
├── cli/           # Entry points Commander.js
├── ui/            # Interface TUI (Ink)
├── orchestrator/  # Orchestrateur central du pipeline
├── agents/        # Agents stateless : PO · Planner · Dev · QA
├── models/        # Model Recommendation Engine
├── providers/     # Adaptateurs LLM : Groq · Gemini · Claude · OpenAI
├── pipeline/      # Pipeline Engine + state machine
├── storage/       # Persistance des runs (JSON → SQLite)
├── metrics/       # Monitoring : coûts, tokens, latence, système
└── types/         # Types TypeScript partagés
```

---

## Workflow de contribution

1. **Fork** le repo et crée une branche depuis `dev` :

   ```bash
   git checkout -b feat/ma-fonctionnalite dev
   ```

2. **Développe** ta fonctionnalité avec des commits atomiques.

3. **Assure-toi** que les checks passent localement :

   ```bash
   npm run typecheck && npm run lint && npm test && npm run build
   ```

4. **Ouvre une Pull Request** vers `dev` (jamais directement vers `main`).

> `main` = production stable. `dev` = branche d'intégration.

---

## Conventions de commit

Ce projet utilise [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <description courte en minuscules>

[corps optionnel]

[footer optionnel : Closes #123]
```

### Types acceptés

| Type       | Usage                                |
| ---------- | ------------------------------------ |
| `feat`     | Nouvelle fonctionnalité              |
| `fix`      | Correction de bug                    |
| `docs`     | Documentation uniquement             |
| `style`    | Formatage, pas de changement logique |
| `refactor` | Refactoring sans fix ni feat         |
| `perf`     | Amélioration de performances         |
| `test`     | Ajout/modification de tests          |
| `build`    | Outils de build, dépendances         |
| `ci`       | CI/CD                                |
| `chore`    | Maintenance, tâches de fond          |
| `revert`   | Revert d'un commit précédent         |

### Exemples

```bash
feat(models): add groq provider adapter
fix(pipeline): handle timeout on qa step
docs(contributing): add commit conventions section
test(agents): add unit tests for po agent
```

Le hook `commit-msg` valide automatiquement le format. Un commit invalide sera rejeté.

---

## Standards de code

- **TypeScript strict** : `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- **ESLint** : configuration `typescript-eslint/strictTypeChecked` + Prettier
- **Formatage** : Prettier, single quotes, trailing commas, 100 chars max
- **Imports** : toujours utiliser `import type` pour les types uniquement
- **Modules** : ESM natif (`"type": "module"`)

Le hook `pre-commit` lance lint-staged automatiquement avant chaque commit.

---

## Tests

- Framework : **Vitest**
- Les tests se trouvent dans `tests/` (mirroring la structure `src/`)
- Vise une couverture ≥ 80% sur les modules critiques (pipeline, models, providers)
- Nomme tes fichiers de test `*.test.ts`

```bash
npm run test:coverage   # rapport de couverture complet
npm run test:watch      # mode watch pendant le développement
```

---

## Soumettre une PR

1. Assure-toi que la branche cible est `dev`
2. Remplis le template de PR
3. Vérifie que tous les checks CI passent
4. Demande une review à au moins un mainteneur
5. Un squash merge sera effectué pour garder un historique propre sur `dev`

---

Des questions ? Ouvre une [Discussion GitHub](../../discussions) ou une issue avec le label `question`.
