# research/ — engine dossiers (repo-only)

**Not shipped.** The installable package is `documd-visuals/`; this directory exists so the *claims inside
it* stay auditable and so an engine upgrade has a re-verification checklist.

## Why it is kept

| Consumer | What it needs from here |
|---|---|
| The completeness claim ("coverage of the official gallery is closed") | `coverage-gap-audit.md` + one `catalogue.md` per engine: the ledger that maps every official unit to *included* (with an example) or *excluded* (with a reason) |
| The next engine upgrade | `notes.md` per engine: version pins, doc extracts, open questions, and what was verified by hand |
| The distilled package docs | `engines/*.md` are written from these dossiers — keeping the raw record makes it possible to re-check a claim without redoing the research |

The package **never references this directory**: `validate-skills.mjs` fails the build if a file inside
`documd-visuals/` cites a `research/` or `scripts/` path, so an installed package can never point at
something that is not there.

## Contents

```
research/
├── coverage-gap-audit.md      # cross-engine audit vs the official galleries (what was missing, what was added)
├── <engine>/catalogue.md      # coverage ledger: every official unit → included (example) / excluded (reason)
└── <engine>/notes.md          # version pins, doc extracts, verification log, open questions
```

Engines: `echarts` · `plantuml` · `infographic` · `vega` · `html-css`.
`plantuml/awslib-inventory.md` lists the legacy `awslib/*` macro families (the package recommends the
`mxgraph.aws4` stencils instead).

### Probes (re-run after an engine upgrade)

| Probe | Covers |
|---|---|
| `node research/plantuml/probe-style-matrix.mjs` | official PlantUML vs this engine on ~86 style probes; prints `BEFORE → AFTER` per probe against the recorded matrix (`plantuml/style-support-matrix.md`) |

## What is generated, and from where

Anything an agent needs *while writing a document* ships with the package and is generated from the
installed engine or from the catalog — never copied out of this directory:

| Output | Location | Built by |
|---|---|---|
| Infographic template key index (113 → structure → item style) | `documd-visuals/engines/infographic-templates.tsv` | `node scripts/sync-engine-indexes.mjs` (`--check` in CI) |
| PlantUML stencil families (61 files) | `documd-visuals/engines/plantuml-stencils/` | `~/works/draw-uml-dev/scripts/gen-uml-stencils.mjs` |
| Per-engine coverage ledgers (units + every example grouped by goal) | `documd-visuals/engines/coverage/*.md` | `node scripts/build-coverage.mjs` (`--check` in CI) |
| Scenario catalog and goal guides | `documd-visuals/catalog/`, `goals/` | `node scripts/build-catalog.mjs`, `node scripts/build-goals.mjs` |

The curated half of each coverage ledger — what the engine does with every unit of its official
documentation — lives in `scripts/coverage-sources/<engine>.md`. Reference examples there are written as
`domain/file` and the builder turns them into links that resolve from the shipped ledger; a reference that
points at nothing fails the build.

## Language

The dossiers are currently written in Chinese; the package is English-only. Rewriting them in English is
optional work — nothing downstream reads them at run time.
