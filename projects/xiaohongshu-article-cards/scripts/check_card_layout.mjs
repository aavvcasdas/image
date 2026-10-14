import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const htmlArg = args[0];

function optionNumber(name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  const value = Number(args[index + 1]);
  if (!Number.isFinite(value)) throw new Error(`${name} 需要数字参数。`);
  return value;
}

if (!htmlArg) {
  console.error(
    '用法：node check_card_layout.mjs <输入 HTML> [--min-footer-gap 0] [--max-empty-ratio 0.10] [--error-empty-ratio 0.14]',
  );
  process.exit(2);
}

const minFooterGap = optionNumber('--min-footer-gap', 0);
const maxEmptyRatio = optionNumber('--max-empty-ratio', 0.10);
const errorEmptyRatio = optionNumber('--error-empty-ratio', 0.14);
const htmlPath = path.resolve(process.cwd(), htmlArg);

async function loadPlaywright() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_MODULE_PATH) candidates.push(process.env.PLAYWRIGHT_MODULE_PATH);
  candidates.push('playwright');

  const pnpmRoot = path.join(
    os.homedir(),
    '.cache',
    'codex-runtimes',
    'codex-primary-runtime',
    'dependencies',
    'node',
    'node_modules',
    '.pnpm',
  );
  const entries = await fs.readdir(pnpmRoot).catch(() => []);
  for (const entry of entries.filter((name) => name.startsWith('playwright@')).sort().reverse()) {
    candidates.push(path.join(pnpmRoot, entry, 'node_modules', 'playwright'));
  }

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // 继续尝试下一个来源。
    }
  }
  throw new Error('未找到 Playwright。请安装 playwright 或设置 PLAYWRIGHT_MODULE_PATH。');
}

async function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // 继续尝试。
    }
  }
  return undefined;
}

await fs.access(htmlPath);
const { chromium } = await loadPlaywright();
const chromePath = await findChrome();
const browser = await chromium.launch(chromePath ? { executablePath: chromePath } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 1600 }, deviceScaleFactor: 1 });

try {
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((image) => (
        image.complete ? Promise.resolve() : new Promise((resolve) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        })
      )),
    );
  });

  const results = await page.locator('.card').evaluateAll(
    (cards, options) => cards.map((card, index) => {
      const rect = card.getBoundingClientRect();
      const tolerance = 1;
      const errors = [];
      const warnings = [];
      const visible = (element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
      };
      const elementName = (element) => {
        const className = typeof element.className === 'string' && element.className.trim()
          ? `.${element.className.trim().replace(/\s+/g, '.')}`
          : '';
        const dataLabel = element.getAttribute('data-layout-label');
        if (dataLabel) return dataLabel;
        return `${element.tagName.toLowerCase()}${className}`;
      };

      const directChildren = [...card.children].filter(visible);
      for (const child of directChildren) {
        const box = child.getBoundingClientRect();
        if (
          box.left < rect.left - tolerance
          || box.right > rect.right + tolerance
          || box.top < rect.top - tolerance
          || box.bottom > rect.bottom + tolerance
        ) {
          errors.push(`直接子元素越出画布：${child.tagName.toLowerCase()}.${child.className || ''}`);
        }
        const childStyle = getComputedStyle(child);
        const constrainedY = ['hidden', 'auto', 'scroll', 'clip'].includes(childStyle.overflowY);
        if (
          child.scrollWidth > child.clientWidth + tolerance
          || (constrainedY && child.scrollHeight > child.clientHeight + tolerance)
        ) {
          errors.push(`直接子元素发生内容溢出：${child.tagName.toLowerCase()}.${child.className || ''}`);
        }
      }

      const footer = card.querySelector('[data-card-footer], .bottom');
      const explicitContent = card.querySelector('[data-card-content]');
      const explicitEnd = card.querySelector('[data-content-end]');
      const moduleCandidates = explicitContent
        ? [...explicitContent.children].filter(visible)
        : directChildren.filter((child) => child !== footer);
      const contentModules = moduleCandidates
        .map((element) => ({ element, box: element.getBoundingClientRect() }))
        .filter(({ box }) => box.height > 4 && box.width > 4)
        .sort((a, b) => a.box.top - b.box.top);
      let contentEnd = explicitEnd;
      if (!contentEnd && explicitContent) {
        const candidates = [...explicitContent.children].filter(visible);
        contentEnd = candidates.at(-1) || explicitContent;
      }
      if (!contentEnd && footer) {
        let sibling = footer.previousElementSibling;
        while (sibling && !visible(sibling)) sibling = sibling.previousElementSibling;
        contentEnd = sibling;
      }

      let footerGap = null;
      let emptyRatio = null;
      let largestModuleGap = null;
      let largestModuleGapRatio = null;
      let largestModuleGapPair = null;
      if (!card.hasAttribute('data-allow-large-gap')) {
        for (let i = 0; i < contentModules.length - 1; i += 1) {
          const current = contentModules[i];
          const next = contentModules[i + 1];
          const gap = next.box.top - current.box.bottom;
          if (gap > 0 && (largestModuleGap === null || gap > largestModuleGap)) {
            largestModuleGap = gap;
            largestModuleGapRatio = gap / rect.height;
            largestModuleGapPair = `${elementName(current.element)} → ${elementName(next.element)}`;
          }
        }
        if (largestModuleGapRatio !== null) {
          if (largestModuleGapRatio > options.errorEmptyRatio) {
            errors.push(
              `主要模块之间空白占比 ${(largestModuleGapRatio * 100).toFixed(1)}%，超过错误阈值 ${(options.errorEmptyRatio * 100).toFixed(1)}%：${largestModuleGapPair}。`,
            );
          } else if (largestModuleGapRatio > options.maxEmptyRatio) {
            warnings.push(
              `主要模块之间空白占比 ${(largestModuleGapRatio * 100).toFixed(1)}%，超过参考值 ${(options.maxEmptyRatio * 100).toFixed(1)}%：${largestModuleGapPair}；请人工确认是否有明确视觉意图。`,
            );
          }
        }
      }
      if (!footer) {
        warnings.push('未找到 data-card-footer 或 .bottom，跳过底部间距检查。');
      } else if (!contentEnd) {
        warnings.push('未找到主体内容结束位置，建议添加 data-card-content 或 data-content-end。');
      } else {
        footerGap = footer.getBoundingClientRect().top - contentEnd.getBoundingClientRect().bottom;
        emptyRatio = footerGap / rect.height;
        if (footerGap < options.minFooterGap - tolerance) {
          errors.push(`主体与页脚间距 ${footerGap.toFixed(1)}px，小于 ${options.minFooterGap}px。`);
        }
        if (!card.hasAttribute('data-allow-large-gap') && emptyRatio > options.errorEmptyRatio) {
          errors.push(
            `主体与页脚之间空白占比 ${(emptyRatio * 100).toFixed(1)}%，超过错误阈值 ${(options.errorEmptyRatio * 100).toFixed(1)}%。`,
          );
        } else if (!card.hasAttribute('data-allow-large-gap') && emptyRatio > options.maxEmptyRatio) {
          warnings.push(
            `主体与页脚之间空白占比 ${(emptyRatio * 100).toFixed(1)}%，超过参考值 ${(options.maxEmptyRatio * 100).toFixed(1)}%；请人工确认是否有明确视觉意图。`,
          );
        }
      }

      return {
        card: index + 1,
        width: rect.width,
        height: rect.height,
        footerGap,
        emptyRatio,
        largestModuleGap,
        largestModuleGapRatio,
        largestModuleGapPair,
        errors,
        warnings,
      };
    }),
    { minFooterGap, maxEmptyRatio, errorEmptyRatio },
  );

  let failed = false;
  for (const result of results) {
    console.log(`卡片 ${result.card}：${result.width}x${result.height}`);
    if (result.footerGap !== null) {
      console.log(
        `  主体到页脚：${result.footerGap.toFixed(1)}px，空白占比 ${(result.emptyRatio * 100).toFixed(1)}%`,
      );
    }
    if (result.largestModuleGap !== null) {
      console.log(
        `  最大模块间空白：${result.largestModuleGap.toFixed(1)}px，空白占比 ${(result.largestModuleGapRatio * 100).toFixed(1)}%（${result.largestModuleGapPair}）`,
      );
    }
    for (const warning of result.warnings) console.log(`  警告：${warning}`);
    for (const error of result.errors) {
      failed = true;
      console.error(`  错误：${error}`);
    }
  }

  if (failed) process.exitCode = 1;
  else console.log('版面校验通过。');
} finally {
  await browser.close();
}
