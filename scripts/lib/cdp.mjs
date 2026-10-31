/**
 * 一个极小的 CDP 客户端。
 *
 * Node 22+ 自带 WebSocket，所以驱动 Edge 不需要 puppeteer —— 这里只有
 * 「起浏览器 → 连页面 → 发命令 → 收事件」四件事，够拍图和量版式用了。
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs/promises';
import path from 'node:path';

export const EDGE =
  process.env.EDGE_PATH ||
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const DEFAULT_PORT = 9333;

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const events = new Map();
  const consoleErrors = [];

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(`${msg.error.message} (${msg.error.code})`)) : resolve(msg.result);
    } else if (msg.method) {
      if (msg.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(msg.params.exceptionDetails?.text ?? 'exception');
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
      }
      if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        consoleErrors.push(msg.params.entry.text);
      }
      const waiters = events.get(msg.method);
      if (waiters?.length) waiters.shift()(msg.params);
    }
  });

  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

  const once = (method) =>
    new Promise((resolve) => {
      const list = events.get(method) ?? [];
      list.push(resolve);
      events.set(method, list);
    });

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.text ?? 'evaluate failed');
    return result.value;
  };

  return { send, once, evaluate, consoleErrors, close: () => ws.close() };
}

/** 起一个 headless Edge，返回一个已经连上的页面 */
export async function launch({ port = DEFAULT_PORT, profileDir } = {}) {
  const profile = profileDir ?? path.join(process.cwd(), '.edge-profile');
  await fs.rm(profile, { recursive: true, force: true });

  const browser = spawn(
    EDGE,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  let wsUrl = null;
  for (let i = 0; i < 80 && !wsUrl; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await res.json();
      wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl ?? null;
    } catch {
      /* 还没起来 */
    }
    if (!wsUrl) await sleep(200);
  }
  if (!wsUrl) {
    browser.kill();
    throw new Error('连不上 Edge 的调试端口，检查 EDGE_PATH 或 9333 是否被占用');
  }

  const page = await connect(wsUrl);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Log.enable');

  return {
    page,
    async goto(url, { width = 1440, height = 980, dark = false, mobile } = {}) {
      await page.send('Emulation.setEmulatedMedia', {
        features: [
          { name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' },
          { name: 'prefers-reduced-motion', value: 'reduce' },
        ],
      });
      await page.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: mobile ?? width < 600,
      });
      const loaded = page.once('Page.loadEventFired');
      await page.send('Page.navigate', { url });
      await loaded;
      await sleep(300);
    },
    close() {
      page.close();
      browser.kill();
    },
  };
}

/** 把 file:// 路径拼成 URL（Windows 盘符要转成 /D:/ 形式） */
export function fileUrl(baseDir, relPath = '') {
  const p = path.join(baseDir, relPath).replace(/\\/g, '/');
  return `file:///${p.replace(/^\/+/, '')}`;
}
