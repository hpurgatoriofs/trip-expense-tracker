# F<N> — <Feature name> · Plan

_Status: Draft · Last updated: <YYYY-MM-DD> · Spec: [F<N>-<slug>.md](../specs/features/F<N>-<slug>.md) (Approved <YYYY-MM-DD>)_

## Approach
How the feature gets built, in 3–6 sentences. Name the layers it touches: domain, services, db, routes, UI.

## Data model changes
Tables, columns, constraints, indexes, and cascades. Write "None" if there are none. Any migration is a `Needs human approval` task.

## Routes and API
Method, path, request, response, and error shapes. Write "None" if there are none.

## Screens
Pages and components, and the states each one renders (from the spec's States & errors). Write "None" if there are none.

## Files changed
| Path (under `app/`) | New or changed | Why |
|---|---|---|
| `src/domain/…` | New | … |

## Tasks

### F<N>.T1 — <short name>
- **Files:** … (about 1–4 files)
- **Depends on:** none (or F<N>.T<n>, …)
- **Work:** … (one checkable thing)
- **Tests:** `F<N>.AC<n> <test name>` in `tests/…`
- **Done when:** … (a check someone can run or see)
- **Needs human approval:** yes — <reason>  _(delete this line if not needed)_

### F<N>.T2 — <short name>
- **Files:** …
- **Depends on:** …
- **Work:** …
- **Tests:** …
- **Done when:** …

## Acceptance criteria map
Spec ACs: <n> · Mapped: <n>

| AC | Mapped to | Task |
|---|---|---|
| F<N>.AC1 | `F<N>.AC1 <test name>` in `tests/domain/…` | T1 |
| F<N>.AC2 | Code review: <reason> | — |

## Sent back to spec
- [ ] … (a product question found during planning, to answer with `/spec-feature F<N>`)

_Or write "None."_

## Decisions log
- <YYYY-MM-DD>: <technical decision> → <reason>
