## Marks (18 official → 16 kept)

| Unit | Fence | Disposition | Example in this package |
|---|---|---|---|
| `bar` · `line` · `area` | vega-lite | kept | `delivery-throughput/*`, `ops-monitoring/incident-trend-stacked-area`, `data-exploration/streamgraph-topic-composition` |
| `point` · `circle` · `square` | vega-lite | kept | `data-exploration/*`, `delivery-throughput/support-capacity-units` |
| `tick` | vega-lite | kept | `data-exploration/stripplot-region-spread` |
| `rect` | vega-lite | kept | `engineering-operations/deploy-frequency-calendar`, `service-reliability/service-drift-lasagna` |
| `rule` | vega-lite | kept | `service-reliability/team-variance-interval`, `delivery-throughput/build-time-candles` |
| `text` | vega-lite | kept | `delivery-throughput/support-capacity-units` |
| `arc` | vega-lite | kept | `delivery-throughput/release-time-split-donut` |
| `trail` | vega-lite | kept | `service-reliability/error-budget-burn-trail` |
| `boxplot` · `errorbar` · `errorband` | vega-lite (composite) | kept | `delivery-throughput/release-duration-distribution`, `service-reliability/forecast-range-band` |
| `image` | vega-lite | **excluded** | needs an external image file |
| `geoshape` | vega-lite | **excluded** | needs GeoJSON/TopoJSON; the export path is offline |

## Transforms (19 Vega-Lite + Vega additions → 25 used)

| Group | Units kept |
|---|---|
| Row/field maths | `calculate` `filter` `fold` `flatten` `pivot` `impute` `sample` |
| Aggregation & windows | `aggregate` `joinaggregate` `window` `stack` `bin` `quantile` |
| Statistics | `density` `regression` `loess` `kde` `kde2d` `isocontour` |
| Joins | `lookup` `sequence` (data generator) |
| Hierarchy & layout (Vega) | `stratify` `tree` `treelinks` `treemap` `pack` `partition` `force` `linkpath` `geopath` `pie` |
| Not used | `project` (geo), `voronoi`, `wordcloud` (covered by the infographic engine), `crossfilter`/`relay` (interaction) |

## Vega-only capability (what Vega-Lite cannot express)

| Unit | Disposition | Example |
|---|---|---|
| `force` + `linkpath` | kept — needs `"static": true` | `dependencies-and-relations/service-call-force-map` |
| `tree` (cluster) + radial | kept | `organization-and-roles/org-chart-radial-tree` |
| `treemap` · `pack` · `partition` (+ `arc`) | kept | `cost-and-budget/cost-center-treemap`, `delivery-throughput/asset-size-packing`, `knowledge-and-outline/catalog-sunburst-share` |
| `kde` · `kde2d` + `isocontour` + `geopath` | kept | `delivery-throughput/release-size-violin`, `ops-monitoring/alert-density-contours` |
| `arc` diagrams / radial layouts | kept | `dependencies-and-relations/module-import-arcs` |
| Parallel coordinates | kept (built from `fold` + faceted lines, not a transform) | `data-exploration/parallel-risk-screen` |
| Word cloud | excluded here — the infographic engine has a template for it | — |

## Composition, interaction, maps

| Unit | Disposition |
|---|---|
| `layer` · `facet` · `concat`/`hconcat`/`vconcat` · `repeat` · `resolve` | kept |
| `params` · `select` · `bind` (interaction) | excluded — an exported image cannot show them; a static overview+detail is built from two views |
| Projections / geo displays | excluded — no external geographic data |
| `mark.invalid` (`filter`, `break-paths-*`, `show`) | documented as a boundary: nulls are filtered by default, so broken lines need an explicit setting |

## Implementation boundaries

| Item | Fact |
|---|---|
| Data resolution order (Vega) | a dataset using `"source"` must be declared **after** the dataset it reads, or the spec fails with `Undefined data set name` |
| Auto-sorting | disabled by the renderer: every ordinal axis whose order matters needs an explicit `sort`, otherwise data row order decides |
| Expression evaluator | `vega-interpreter` — expressions are allowed, JavaScript functions are not |
| External data | `data.url` is unreliable on the export path; use `values` or the `sequence` generator |
| `kde2d` coordinates | receives **pixel** values (`scale('x', datum.field)`), so `bandwidth` is in pixels |
