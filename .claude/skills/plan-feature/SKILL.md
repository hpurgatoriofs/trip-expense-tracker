---
name: plan-feature
description: Write the technical plan for one approved Trip Expense Tracker feature (F<N>) at docs/plans/, with small tasks and a map from every acceptance criterion to a test. Refuses unless the spec is Approved with no open questions. Use when the user runs /plan-feature F<N> or asks to plan a feature by its ID.
argument-hint: F<N> (e.g. F2)
model: haiku
---

# Plan a feature

Turn one approved spec in `docs/specs/features/F<N>-*.md` into a technical plan at `docs/plans/F<N>-<slug>.md`. The plan says HOW to build the feature. It never changes WHAT the spec says.

Target feature: **$ARGUMENTS**

## 1. Resolve and gate the spec

- Expect an ID like `F2` (accept `f2` or `2`). No argument → list the spec files and ask which one.
- Find `docs/specs/features/F<N>-*.md`. Not found → say so and stop.
- Read its `_Status:` line. If it is not `Approved`, **stop** and say: "F<N> spec is <status>. A plan needs an approved spec. Run /spec-feature F<N> first."
- Read its `## Open questions` section. If it has any item other than "None.", **stop**, list the open items, and say: "Answer these with /spec-feature F<N>, then approve the spec."
- `<slug>` = the spec's file name without `.md`. The plan uses the same name in `docs/plans/`.
- If the plan already exists, read it and **revise** it: keep its Decisions log and change only what the spec change affects. If you change an `Approved` plan, set it back to `Draft` and note why in the Decisions log.

## 2. Gather context (read all of it)

- The feature spec, in full.
- `CLAUDE.md`, in full (stack, folder layout, conventions).
- Every file in `docs/rules/`.
- The approved specs this feature depends on (its **Dependencies** section), and the `docs/specs/product.md` sections the spec cites.
- Existing code in `app/` that the feature touches. Read it; don't assume what is there.

## 3. Choose the approach

- Make only **technical** decisions: libraries from the CLAUDE.md stack, file placement, schema shape, route shape. Log each one in the plan's Decisions log with its reason.
- Don't make product decisions. If planning shows the spec is unclear, incomplete, or contradicts `product.md`, don't guess. Record it under **Sent back to spec** in the plan and tell the user to run `/spec-feature F<N>`.

## 4. Write the plan

Create `docs/plans/F<N>-<slug>.md` (create the `docs/plans/` folder if it is missing) by filling in [plan-template.md](plan-template.md). Follow these rules:

- **Layout:** Follow the folder layout in CLAUDE.md. List every file under `app/` that the plan adds or changes. Put business rules in `src/domain/` as pure functions, and keep the routes in `src/app/` thin.
- **Tasks:** Split the work into small tasks named `F<N>.T1`, `F<N>.T2`, … Each task lists its files, the earlier tasks it depends on, the work, and a **Done when** check that someone can verify.
- **Task size:** A task touches about 1–4 files, does one checkable thing, and can be built in one developer-agent run. If a task is bigger, split it.
- **Tests:** Every task that changes code has a **Tests:** line naming the unit tests it adds. Put the AC ID in each test name (for example `F3.AC4 refuses a duplicate name`). The tests belong to the same task as the code they cover.
- **Project setup:** If `app/package.json` does not exist, make the plan's first task set up the project from CLAUDE.md: Next.js with TypeScript, Vitest, Drizzle, the npm scripts from the Commands table, the logger in `src/lib/logger.ts`, and `.env.example`. Mark it `Needs human approval`, because it adds env files.
- **Human approval:** Mark a task `Needs human approval` if it touches authentication, secrets or env files, database migrations, CI or deploy config, or deletes or disables a test (project-rules.md › Security and access, Testing).
- **Acceptance criteria map:** One row for **every** `F<N>.AC<n>` in the spec. Map each row to named unit tests with the AC ID in the test name (for example `F3.AC4 refuses a duplicate name`), or to "code review" with a reason. Ownership checks, database constraints and cascading deletes are always "code review" (CLAUDE.md › Folder layout).
- **Count check:** Before saving, collect the distinct `F<N>.AC<n>` IDs from the spec and compare them with the map. The counts must match. If any AC is missing, add it before you finish.

## 5. Finish

- Never edit the spec.
- Reply with the plan's file path, the number of tasks, the number of ACs mapped (n of n), the tasks that need human approval, and any items under **Sent back to spec**.
- **Open sent-back items:** If **Sent back to spec** has any open item, the plan stays `Draft` and cannot be approved. Tell the user to run `/spec-feature F<N>`, then re-run `/plan-feature F<N>`.
- **Approval:** A plan is saved as `Draft`. Ask the user whether to approve it. Set `_Status: Approved` (with today's date) and add a Decisions log entry only when the user explicitly says yes, in this run or later. Never approve a plan on your own.
