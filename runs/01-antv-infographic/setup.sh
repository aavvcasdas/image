#!/usr/bin/env bash
# 安装 Run 01 依赖（AntV Infographic SSR 渲染引擎）。幂等。
set -euo pipefail
cd "$(dirname "$0")"
[ -d node_modules/@antv/infographic ] || npm i --silent --no-audit --no-fund @antv/infographic  # 装在仓库根 node_modules（npm 向上寻找包根）
echo "依赖就绪：@antv/infographic $(node -p "require('./node_modules/@antv/infographic/package.json').version")"
