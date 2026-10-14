## Rules (5 original → all kept)

| Rule | Disposition | Where it is enforced |
|---|---|---|
| Embed HTML directly, never in a ` ```html ` fence | kept | `SKILL.md` iron rule 4 · validator (` ```html ` in examples fails) |
| No blank line inside an HTML block | kept | validator warns per file; `engines/html-css.md` explains the CommonMark termination |
| Analyse content before choosing a layout (density → structure → mood) | kept | `engines/html-css.md` |
| Choice of column count (one / two / three) | kept | [Page skeletons](../html-css.md) — the geometry table |
| Layer semantics, consistent colour, grid discipline | kept | [Page skeletons](../html-css.md) — the rules under the table |

Added from implementation archaeology: class-name prefixes (`card-*`) because `<style scoped>` does
nothing, a `max-width` on the card root, and inline images as data URLs.

## Inventory (90 files → 90 kept, reorganised)

| Group | Count | Disposition |
|---|---|---|
| `architecture/layouts` | 13 | **triaged** — see below |
| `architecture/styles` | 12 | **triaged** — see below |
| `infocard/layouts` | 36 | **triaged** — see below |
| `infocard/styles` | 29 | **triaged** — see below |

### Design-library triage (2026-09-22)

The inherited library (49 layouts + 41 styles, 604 KB) was audited against the catalog: each entry's
“best for” was matched to the 30 goal domains. Almost all of it was **form, not intent** — the same reader
need already served by an example, with different geometry or palette. Per the taxonomy rule that scenarios
are defined by reader and use (not by template), the library is not shipped:

| Outcome | Count | Detail |
|---|---|---|
| Promoted to a scenario | 1 | `quote-card` → [`internal-documents/key-quote-card.md`](../../examples/internal-documents/key-quote-card.md) — citing a statement had no scenario before |
| Folded into this engine reference | 2 | `connectors` and `layer-layouts` are technique, not content → their content became the *Page skeletons* and *Connectors* sections of [`../html-css.md`](../html-css.md) |
| Deleted | 87 | Content prototypes already carded (board memo, policy memo, incident review, compliance audit, risk register, sales/partner brief, customer story, research abstract, news bulletin, org update, education module, metric board, roadmap board), page geometry (columns, sidebar variants, bento, hub-spoke, banner, nested containers, split panel, hero), and all 41 tone styles — a tone is a delivery attribute, not a scenario |

Recoverable from git history if ever needed: `git show HEAD:infocard/layouts/<name>.md`,
`git show HEAD:architecture/styles/<name>.md`.

## Two jobs, one tool

| Job | Where the examples live |
|---|---|
| Content artefact — one page that settles one question | `internal-documents/`, `customer-and-partner-comms/`, `catalogues-and-inventories/`, `incident-management/incident-review-card` |
| System architecture — the whole system on one page | `system-architecture/` — seven shapes: `layered-with-wings` (the default), `layer-stack`, `operations-overview`, `nested-zones`, `pipeline-stages`, `request-paths`, `service-catalog` |

## Export boundary (verified)

| Item | Fact | Consequence |
|---|---|---|
| HTML export | a card is rasterised — the exported file contains one `<img>` + a data URL, class names and text are gone | never keep the only copy of a fact inside a card |
| DOCX export | same rasterisation via the HTML plugin | card text is not selectable or searchable |
| `grid` / `flex` / `border-radius` / `gradient` / `box-shadow` | no DOCX semantics | these survive as a screenshot, not as reflowable content |
| `<style scoped>` | dead attribute, and the pipeline has no scoping step | prefix every class |
| Fonts | follow the document theme | do not hard-code `font-family` |
| Images | local or data URLs only | remote images are unreliable offline |
