# Branch Protection Rules

These rules must be configured manually in **GitHub → Settings → Branches**.

---

## Branch strategy

```
main        ← stable production, protected, releases only
dev         ← integration branch, protected, all PRs target here
feat/*      ← feature branches, created from dev
fix/*       ← bug fix branches, created from dev
chore/*     ← maintenance branches, created from dev
```

---

## `main` — production branch

**Settings → Branches → Add rule → Branch name pattern: `main`**

| Rule                                                   | Value                                    |
| ------------------------------------------------------ | ---------------------------------------- |
| Require a pull request before merging                  | ✅                                       |
| Required approvals                                     | 1                                        |
| Dismiss stale PR approvals when new commits are pushed | ✅                                       |
| Require review from Code Owners                        | ✅                                       |
| Require status checks to pass                          | ✅                                       |
| Required checks                                        | `CI / CI — Node 20`, `CI / CI — Node 22` |
| Require branches to be up to date before merging       | ✅                                       |
| Require conversation resolution before merging         | ✅                                       |
| Require linear history                                 | ✅                                       |
| Do not allow bypassing the above settings              | ✅                                       |
| Allow force pushes                                     | ❌                                       |
| Allow deletions                                        | ❌                                       |

> Merges to `main` should only come from `dev` via a release PR.

---

## `dev` — integration branch

**Settings → Branches → Add rule → Branch name pattern: `dev`**

| Rule                                                   | Value                                                           |
| ------------------------------------------------------ | --------------------------------------------------------------- |
| Require a pull request before merging                  | ✅                                                              |
| Required approvals                                     | 1                                                               |
| Dismiss stale PR approvals when new commits are pushed | ✅                                                              |
| Require status checks to pass                          | ✅                                                              |
| Required checks                                        | `CI / CI — Node 20`, `Validate PR title (Conventional Commits)` |
| Require branches to be up to date before merging       | ✅                                                              |
| Require conversation resolution before merging         | ✅                                                              |
| Allow squash merging only                              | ✅ (configure in repo Settings → General)                       |
| Allow force pushes                                     | ❌                                                              |
| Allow deletions                                        | ❌                                                              |

---

## Merge strategy (Settings → General)

| Option                             | Value                                 |
| ---------------------------------- | ------------------------------------- |
| Allow merge commits                | ❌                                    |
| Allow squash merging               | ✅ — default commit message: PR title |
| Allow rebase merging               | ❌                                    |
| Automatically delete head branches | ✅                                    |

---

## Labels to create

Go to **Issues → Labels** and create the following:

| Label            | Color     | Description                       |
| ---------------- | --------- | --------------------------------- |
| `bug`            | `#d73a4a` | Something isn't working           |
| `enhancement`    | `#a2eeef` | New feature or request            |
| `dependencies`   | `#0075ca` | Dependency update                 |
| `automated`      | `#e4e669` | Created by a bot                  |
| `github-actions` | `#000000` | GitHub Actions related            |
| `documentation`  | `#0075ca` | Improvements or additions to docs |
| `stale`          | `#ffffff` | No recent activity                |
| `pinned`         | `#e99695` | Exempt from stale bot             |
| `security`       | `#d73a4a` | Security related                  |
| `question`       | `#d876e3` | Further information is requested  |
| `size/XS`        | `#3cbf00` | < 10 lines changed                |
| `size/S`         | `#5d9801` | < 100 lines changed               |
| `size/M`         | `#7f7203` | < 500 lines changed               |
| `size/L`         | `#a14c05` | < 1000 lines changed              |
| `size/XL`        | `#c32607` | > 1000 lines changed              |
| `cli`            | `#bfdadc` | CLI interface                     |
| `ui`             | `#bfdadc` | TUI interface                     |
| `pipeline`       | `#f9d0c4` | Pipeline engine                   |
| `agents`         | `#f9d0c4` | Agent layer                       |
| `models`         | `#c5def5` | Model recommendation engine       |
| `providers`      | `#c5def5` | LLM providers                     |
| `storage`        | `#fef2c0` | Storage layer                     |
| `metrics`        | `#fef2c0` | Metrics and monitoring            |
| `types`          | `#e0d9f7` | Shared TypeScript types           |
| `triage`         | `#ededed` | Needs triage                      |
