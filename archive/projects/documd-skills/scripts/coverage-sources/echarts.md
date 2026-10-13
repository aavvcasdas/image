## Chart families (24 official → 22 kept)

| Family | `series.type` | Disposition | Example in this package |
|---|---|---|---|
| Line | `line` | kept | `ops-monitoring/trend-line-multi-series`, `ops-monitoring/incident-trend-stacked-area` |
| Bar | `bar` | kept | `business-reporting/comparison-bars`, `cost-and-budget/run-rate-waterfall`, `goal-and-status-reporting/goal-attainment-background-bars` |
| Pie | `pie` | kept | `cost-and-budget/pie-budget-share`, `go-to-market/donut-channel-mix`, `lead-source-rose`, `cloud-spend-nested-pie` |
| Scatter | `scatter` `effectScatter` | kept | `data-exploration/scatter-segment-correlation`, `ops-monitoring/effectscatter-outlier-alerts` |
| Candlestick | `candlestick` | kept | `business-reporting/candlestick-quarterly-price-range` |
| Radar | `radar` | kept | `ops-monitoring/radar-capability-profile` |
| Boxplot | `boxplot` | kept | `service-reliability/boxplot-latency-distribution` |
| Heatmap | `heatmap` | kept | `ops-monitoring/heatmap-incident-load`, `engineering-operations/calendar-release-pace` |
| Graph | `graph` | kept | `dependencies-and-relations/graph-platform-dependencies`, `service-ownership-circle-graph` |
| Lines | `lines` | kept | `network-topology/lines-route-flows` |
| Tree | `tree` | kept | `incident-management/tree-support-routing` |
| Treemap | `treemap` | kept | `cost-and-budget/treemap-portfolio-breakdown` |
| Sunburst | `sunburst` | kept | `cost-and-budget/sunburst-lifecycle-share` |
| Parallel | `parallel` | kept | `data-exploration/parallel-risk-screen` |
| Sankey | `sankey` | kept | `product-metrics/sankey-channel-to-fulfilment` |
| Funnel | `funnel` | kept | `product-metrics/funnel-stage-conversion` |
| Gauge | `gauge` | kept | `service-reliability/gauge-sla-attainment` |
| PictorialBar | `pictorialBar` | kept | `delivery-throughput/pictorialbar-capacity-symbols` |
| ThemeRiver | `themeRiver` | kept | `knowledge-and-outline/themeriver-topic-attention` |
| Calendar | `calendar` + `heatmap`/`scatter` | kept | `engineering-operations/calendar-release-pace` |
| Matrix | `matrix` (v6) | kept | `ops-monitoring/matrix-service-scorecards` |
| Chord | `chord` (v6) | kept | `organization-and-roles/chord-team-handoffs` |
| **GEO/Map** | `map` `geo` | **excluded** | needs `registerMap` and map data the package does not ship; no GeoJSON on the offline export path |
| **Custom** | `custom` | **excluded** | needs a JS `renderItem` function; the option must stay pure JSON |

## GL / 3D (11 official families → all excluded)

`globe` · `bar3D` · `scatter3D` · `surface` · `map3D` · `lines3D` · `line3D` · `scatterGL` · `linesGL` ·
`flowGL` · `graphGL` — all require `echarts-gl`, which is not bundled. Use the 2D equivalents.

## Components (28 official → 21 kept)

| Kept | Excluded (interaction-only or unusable here) |
|---|---|
| `title` `legend` `grid` `xAxis`/`yAxis` `polar` `radiusAxis`/`angleAxis` `radar` `visualMap` `markLine`/`markArea`/`markPoint` `dataset` + `encode` `graphic` `aria` `parallel`/`parallelAxis` `singleAxis` `calendar` `matrix` | `tooltip` `dataZoom` `toolbox` `brush` `axisPointer` `timeline` `thumbnail` — an exported image cannot show them; `geo` — see above |

## Capability items

| Item | Disposition |
|---|---|
| `dataset.source` + `encode` + `dimensions` | kept — `delivery-throughput/backlog-ranking-dataset` |
| `dataset.transform` | **excluded — broken**: any `sort`/`filter` transform throws `RangeError: Maximum call stack size exceeded` at `setOption` under both the SVG and canvas renderers (reproduced against 6.1.0, the current release). Sort and derive upstream |
| Functions anywhere in the option | excluded — the block is parsed as JSON; use template strings and per-item label objects |
| Rich text labels (`label.rich`) | kept — `cost-and-budget/cloud-spend-nested-pie` |
| Visual mapping | kept (`visualMap`) |
| Events and actions | excluded — interaction-only |
| Canvas renderer | excluded — this pipeline renders SVG, so canvas-only effects (trail lines, heatmap blending) are unavailable |
