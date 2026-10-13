## UML diagrams (9)

| Official type | Level | Disposition | Evidence / example |
|---|---|---|---|
| Class | L1 | kept | 82 fixtures · `software-design/domain-class-model.md` |
| Sequence | L1 | kept | 99 fixtures (12 with `autonumber`) · `software-design/api-interaction-sequence.md` |
| Activity | L1 | kept | 56 fixtures + 13 swimlane + 19 legacy · `process-and-workflow/basic-activity-flow.md`, `approval-workflow-swimlane.md` |
| State | L1 | kept | 32 fixtures · `software-behaviour/order-state-machine.md` |
| Use case | L1 | kept | 25 fixtures · `software-design/use-case-model.md` |
| Component | L1 | kept | 32 fixtures · `software-design/component-decomposition.md` |
| Deployment | L1 | kept | 59 fixtures · `software-behaviour/runtime-deployment-topology.md` |
| Object / Map | L1 | kept | 14 fixtures · `software-design/object-snapshot.md` |
| Timing | **L2** | excluded | Parsed, then passed through as text — no drawing. Use a `sequence` diagram for timing |

## Non-UML diagrams (18)

| Official type | Level | Disposition | Evidence / example |
|---|---|---|---|
| ArchiMate | L1 | kept | 11 fixtures + archimate macros · `enterprise-architecture/archimate-layered-model.md` |
| MindMap | L1 | kept | 27 fixtures · `knowledge-and-outline/topic-mindmap.md` |
| Gantt | L1 | kept | 111 fixtures (largest corpus) · `planning-and-roadmap/release-gantt-plan.md` |
| packetdiag | L1 | kept | 16 fixtures · `network-topology/packet-layout-tcp-header.md` |
| ER / IE (crow's foot) | L1 | kept | 6 fixtures · `data-platform/entity-relationships-crows-foot.md` |
| **WBS** | **L2** | excluded | `@startwbs` parses, exits 0, emits a 342-byte empty SVG (official baseline 4,535 B). Use `@startmindmap` or a boxed rectangle tree |
| **Salt** | **L2** | excluded | Whole block passed through as text. Use an HTML/CSS mockup card |
| ditaa · JSON · YAML · EBNF · Regex · nwdiag · SDL · Chronology · Math · Chart diagram · Files tree | L3 | excluded | No parser rule; the block falls through to `verbatim`. Use a rectangle graph, or a code fence for the raw notation |

## Features (4 official + 5 implementation)

| Unit | Level | Disposition |
|---|---|---|
| Creole rich text (bold, lists, tables, emoji, HTML fragments) | L1 | kept — 47 fixtures |
| Preprocessing (`!include`, `!define`, `!pragma`, `!theme`, `!function`) | L1 | kept — 30 fixtures, 123 `!include` uses |
| Hyperlinks / tooltips | unverified | not used in examples — no fixture coverage |
| OpenIconic / Sprite icons | unverified | not used — icon needs go to `mxgraph.*` stencils |
| `mxgraph.<family>.<icon>` stencils | implementation | **kept — the engine's differentiator**, 9,514 icons / 60 families → `../plantuml-stencils/` |
| Inline style suffixes (`#fill`, `##stroke`, `#c;line:red`) | implementation | kept |
| Nested containers (`cloud`, `node`, `rectangle`, `database`, `package`, `frame`) | implementation | kept |
| Layout selection (`!pragma layout elk\|vizjs`) | implementation | kept; sequence diagrams ignore it (fixed grid) |
| C4 macros (`C4_*`) | implementation | kept (T2) |
| awslib macros (`!include <awslib/...>`) | implementation | kept (T2) — prefer `mxgraph.aws4` stencils for new work |
| `@startuml` type inference | implementation | discouraged — write the explicit type keyword |

## Stencil families (60)

Covered in depth: `AWS4` · `Azure` · `GCP2` · `Kubernetes` · `Networks` · `Cisco` / `Cisco19` ·
`Cisco Safe` · `BPMN` · `EIP` · `Lean Mapping` · `Archimate` / `Archimate 3` · `Mockup` / `Webicons`.
Neutral fallbacks: `Basic`, `Flowchart`. The remaining families are indexed in `../plantuml-stencils/`
and intentionally have no example — domain-specific (PID, Rack, Veeam, …) or superseded (AWS, AWS2, AWS3).
