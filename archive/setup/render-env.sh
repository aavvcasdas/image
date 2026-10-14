#!/usr/bin/env bash
# ============================================================================
#  render-env.sh — 在"无浏览器 / 无中文字体"的干净 Linux 沙箱里，
#  搭出一套可以跑 HTML/CSS/SVG → PNG 的**纯代码渲染**环境。
#
#  只走 npm registry + github.com + pypi.org 三个白名单源，不需要任何 API Key。
#  幂等：可重复执行。
#
#  产出：
#    $RENDER_HOME/chromium          静态 Chromium（headless shell）
#    $RENDER_HOME/lib/*.so          Chromium 需要的 NSS/NSPR 等私有 so
#    $RENDER_HOME/node_modules      puppeteer-core + @sparticuz/chromium
#    ~/.fonts/NotoSansSC-*.otf     中文字体（fontconfig 默认目录，见 /etc/fonts/fonts.conf）
#
#  用法：  bash setup/render-env.sh
#          export LD_LIBRARY_PATH=$RENDER_HOME/lib:$LD_LIBRARY_PATH
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RENDER_HOME="${RENDER_HOME:-/tmp/render-env}"
FONT_DIR="${FONT_DIR:-$HOME/.fonts}"
mkdir -p "$RENDER_HOME" "$FONT_DIR"

say() { printf '\033[1;36m[render-env]\033[0m %s\n' "$*"; }

# ---------------------------------------------------------------- 1. 中文字体
# 沙箱里连一个 CJK 字形都没有，中文会渲染成空白方块。从 notofonts/noto-cjk
# 做「稀疏检出」，只拉 SC 子集 OTF（每个约 8MB），不下载整个仓库。
if ! ls "$FONT_DIR"/NotoSansSC-*.otf >/dev/null 2>&1; then
  say "拉取中文字体 noto-cjk (Sans/Serif SC SubsetOTF) ..."
  tmp=$(mktemp -d)
  git clone --depth 1 --filter=blob:none --sparse -q \
    https://github.com/notofonts/noto-cjk.git "$tmp/noto"
  ( cd "$tmp/noto" && git sparse-checkout set Sans/SubsetOTF/SC Serif/SubsetOTF/SC >/dev/null )
  cp "$tmp/noto"/Sans/SubsetOTF/SC/NotoSansSC-{Regular,Bold,Medium,Black,Light}.otf "$FONT_DIR"/
  cp "$tmp/noto"/Serif/SubsetOTF/SC/NotoSerifSC-{Bold,Regular}.otf "$FONT_DIR"/ 2>/dev/null || true
  rm -rf "$tmp"
else
  say "中文字体已存在，跳过"
fi
# 沙箱没有 fc-cache，但 fontconfig 会自己扫描 ~/.fonts 并写缓存，无需额外命令。

# ------------------------------------------------- 2. Chromium + puppeteer-core
cd "$RENDER_HOME"
if [ ! -d node_modules/puppeteer-core ] || [ ! -d node_modules/@sparticuz/chromium ]; then
  say "安装 puppeteer-core + @sparticuz/chromium (npm) ..."
  npm i --silent --no-audit --no-fund puppeteer-core @sparticuz/chromium
fi

# ------------------------------------------------------- 3. Chromium 私有依赖库
# 这个沙箱的 /usr/lib 里没有 libnspr4 / nss 等库（ldconfig 缓存也是空的）。
# 两个 npm 包正好把需要的 so 打包进了 tarball：
#   - @achingbrain/nss      → libnspr4.so / libnss3.so / libnssutil3.so ...
#   - chrome-aws-lambda     → bin/aws.tar.br 里是 Amazon Linux 版 nss/sqlite/expat/uuid
if [ ! -f "$RENDER_HOME/lib/libnspr4.so" ]; then
  say "从 npm 包 @achingbrain/nss 提取 NSS/NSPR 共享库 ..."
  npm pack --silent @achingbrain/nss >/dev/null
  mkdir -p "$RENDER_HOME/lib"
  tar xzf achingbrain-nss-*.tgz -C "$RENDER_HOME/lib" --strip-components=2 package/linux \
    --wildcards 'package/linux/*.so*' 2>/dev/null || \
  tar xzf achingbrain-nss-*.tgz -C "$RENDER_HOME" package/linux
  [ -f "$RENDER_HOME/lib/libnspr4.so" ] || cp "$RENDER_HOME/package/linux"/*.so* "$RENDER_HOME/lib/"
fi
if [ ! -f "$RENDER_HOME/lib/libsqlite3.so.0" ]; then
  say "从 npm 包 chrome-aws-lambda 提取 aws.tar.br（brotli） ..."
  npm pack --silent chrome-aws-lambda@10.1.0 >/dev/null
  tar xzf chrome-aws-lambda-10.1.0.tgz package/bin/aws.tar.br
  node -e "
    const fs=require('fs'),zlib=require('zlib');
    fs.writeFileSync('$RENDER_HOME/aws.tar',
      zlib.brotliDecompressSync(fs.readFileSync('package/bin/aws.tar.br')));
  "
  tar xf "$RENDER_HOME/aws.tar" -C "$RENDER_HOME"
  cp "$RENDER_HOME"/lib/*.so* "$RENDER_HOME/lib/" 2>/dev/null || true
fi

# --------------------------------------------------------------- 4. 自检
say "自检：启动 Chromium 并渲染一张中文测试图 ..."
CHROME_BIN=$(node -e "
  import('$RENDER_HOME/node_modules/@sparticuz/chromium/build/index.js')
    .then(async m => { console.log(await m.default.executablePath()); });
" 2>/dev/null || node --input-type=module -e "
  import chromium from '$RENDER_HOME/node_modules/@sparticuz/chromium/build/index.js';
  console.log(await chromium.executablePath());
")
LD_LIBRARY_PATH="$RENDER_HOME/lib:${LD_LIBRARY_PATH:-}" \
  node "$SCRIPT_DIR/shot.mjs" --selftest

say "完成。渲染时请带上： export LD_LIBRARY_PATH=$RENDER_HOME/lib:\$LD_LIBRARY_PATH"
say "Chromium: ${CHROME_BIN:-$RENDER_HOME/chromium}   fonts: $FONT_DIR"
