# Run 06 · geekjourneyx/md2wechat-skill（3696★，2026-10）— 未能实跑

**项目**：面向 AI Agent 的微信公众号创作与发布 CLI —— Markdown 排版、AI 配图、预览、草稿创建。
Go 编写，通过 npm wrapper（`@geekjourneyx/md2wechat`）分发；实际二进制从 GitHub Release 下载。

## 为什么没跑起来

沙箱的对外网络只允许白名单域名（github.com / api.github.com / npm / pypi）。本 Run 依次尝试了三条路径，全部失败：

| 路径 | 结果 |
|------|------|
| `npm i @geekjourneyx/md2wechat`（postinstall 下载） | `unable to verify the first certificate`；加 `NODE_TLS_REJECT_UNAUTHORIZED=0` 后变成 `ECONNRESET` |
| `curl -L` 直连 release 资产 | exit 35（SSL connect error）——重定向落在白名单外的 `objects.githubusercontent.com` |
| `gh api .../releases/assets/<id>`（Accept: octet-stream） | 重定向到 `release-assets.githubusercontent.com`，同样被拦 |
| 检查仓库内是否有可复用资产 | `themes/*.yaml` 只是元数据（`name/type/api_theme`），真实样式在 Go 二进制的 embed 里，无法借用 |

沙箱也没有 Go 工具链（`go` 不存在），无法从源码构建。

## 结论与建议

- 这是**环境限制**，不是项目问题：在有完整网络的机器上 `npm i -g @geekjourneyx/md2wechat@3.8.0` 即可使用。
- 若要在本仓库体系内继续推进公众号方向，可行的替代是：用 Run 02（html-anything）的 `article-magazine`
  等模板 + Run 03/05 的渲染链路，产出同等的图文；配图继续走 Arena 生图。
- 保留下来的 vendor 源码（`projects/md2wechat-skill/`）里，`skills/`、`docs/`、`examples/` 仍有参考价值
  （例如它的公众号排版约定与 Agent 使用说明）。
