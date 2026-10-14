# Run 05 · EpicInfographics 动画链路（HTML → GIF/MP4）

同一个项目（440★）的第二条能力：`scripts/animate.mjs` 把 CSS 动画**逐帧 scrub**后合成视频
（用 Web Animations API 在精确时间戳截屏，不录屏，所以每次渲染像素级一致），再用 ffmpeg 拼帧。

## 实跑产出

- `animated.gif`（1080×1420，4.8s，15fps，549 KB）
- `animated.mp4`（1080×1420，4.5s，24fps，H.264，225 KB）
- `sheet.png` —— 8 帧 contact sheet（**评审动画靠看抽帧图**，因为人看不到视频本体）

时间线：标题 0–0.6s → 台阶错峰生长 0.6–2.4s（`scaleY` + 底部 origin）→ 倍数标注弹出 2.4–3.0s → 停留 1.4s。

## 复现

```bash
export LD_LIBRARY_PATH=/tmp/render-env/lib:$LD_LIBRARY_PATH CHROME_BIN=/tmp/chromium
# 沙箱无 ffmpeg：用 npm 静态二进制
export FFMPEG=/tmp/venv-v/node_modules/@ffmpeg-installer/linux-x64/ffmpeg
SC=../../projects/epic-infographics/skills/epic-infographics/scripts
node $SC/check.mjs infographic-animated.html --width 1080 --height 1420
node $SC/animate.mjs infographic-animated.html animated.gif --width 1080 --height 1420 --fps 15 --hold 1.4 --sheet sheet.png
node $SC/animate.mjs infographic-animated.html animated.mp4 --width 1080 --height 1420 --fps 24 --hold 1.2
```

首次需要 ffmpeg 时：
```bash
mkdir -p /tmp/venv-v && cd /tmp/venv-v && npm init -y && npm i @ffmpeg-installer/ffmpeg
```
