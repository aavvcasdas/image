/**
 * local-chromium.cjs — 无网沙箱的 playwright/puppeteer 适配垫片
 *
 * 用法：NODE_OPTIONS="--require /path/to/setup/local-chromium.cjs" node your-script.js
 *
 * 作用：拦截 playwright / playwright-core / puppeteer-core 的 launch 调用，
 *      自动补上 executablePath（默认 /tmp/chromium，可用 CHROMIUM_PATH 覆盖），
 *      这样上游项目源码零改动即可运行，不需要 npx playwright install。
 */
const Module = require('module');
const EXE = process.env.CHROMIUM_PATH || '/tmp/chromium';
const origLoad = Module._load;

function patch(obj, key) {
  if (!obj || obj.__localChromiumPatched) return;
  const orig = obj.launch;
  if (typeof orig !== 'function') return;
  obj.launch = function (options = {}) {
    return orig.call(this, { executablePath: EXE, ...options });
  };
  obj.__localChromiumPatched = true;
}

Module._load = function (request, parent, isMain) {
  const mod = origLoad.apply(this, arguments);
  if (['playwright', 'playwright-core', '@playwright/test', 'puppeteer-core', 'puppeteer'].includes(request)) {
    for (const t of ['chromium', 'firefox', 'webkit']) patch(mod && mod[t], t);
    if (mod && mod.default) for (const t of ['chromium', 'firefox']) patch(mod.default[t], t);
  }
  return mod;
};
