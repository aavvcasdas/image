#!/usr/bin/env bash
# ============================================================================
#  local-browser.sh — 让「依赖 playwright / puppeteer 的项目」在无网沙箱里
#  用本地静态 Chromium 跑起来（不下载 playwright 官方浏览器）。
#
#  原理：把 /tmp/chromium（静态 headless shell）放到 playwright 期望的路径上，
#        并补 INSTALLATION_COMPLETE 标记；JS 侧由 setup/local-chromium.cjs 注入
#        executablePath，Python 侧无需改代码即可启动。
#
#  用法：  bash setup/local-browser.sh
#          export LD_LIBRARY_PATH=/tmp/render-env/lib:$LD_LIBRARY_PATH
#          export NODE_OPTIONS="--require $PWD/setup/local-chromium.cjs"
# ============================================================================
set -euo pipefail
CHROME_BIN="${CHROME_BIN:-/tmp/chromium}"
[ -x "$CHROME_BIN" ] || { echo "找不到 $CHROME_BIN，请先跑 archive/setup/render-env.sh"; exit 1; }

# --- Python playwright：伪造成它期望的目录结构 -------------------------------
for rev in 1248; do
  d="$HOME/.cache/ms-playwright/chromium_headless_shell-$rev/chrome-headless-shell-linux64"
  mkdir -p "$d"; cp -f "$CHROME_BIN" "$d/chrome-headless-shell"; chmod +x "$d/chrome-headless-shell"
  touch "$HOME/.cache/ms-playwright/chromium_headless_shell-$rev/INSTALLATION_COMPLETE"
  # 有头版路径也放一份，个别项目用 chromium 而非 headless_shell
  d2="$HOME/.cache/ms-playwright/chromium-$rev/chrome-linux"
  mkdir -p "$d2"; cp -f "$CHROME_BIN" "$d2/chrome"; chmod +x "$d2/chrome"
  touch "$HOME/.cache/ms-playwright/chromium-$rev/INSTALLATION_COMPLETE"
done
echo "[local-browser] playwright(py) 已指向 $CHROME_BIN"
echo "[local-browser] JS 侧请导出 NODE_OPTIONS=\"--require <repo>/setup/local-chromium.cjs\""
