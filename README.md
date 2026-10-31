# SealPack 文档站

[SealPack](https://github.com/hmilyld/SealPack) 的在线手册，中英双语。Astro 7 + Tailwind 4，
纯静态输出，没有客户端框架、没有 CDN、没有远程字体。

- 中文：`/`、`/docs/<slug>`
- English：`/en`、`/en/docs/<slug>`

中文是默认语言，挂在根路径上，所以原有链接不会因为加英文而改变。

## 命令

```bash
pnpm install
pnpm run dev       # 开发服务器
pnpm run build     # 产出 dist/
pnpm run check     # 类型检查（astro check，含 .astro 文件）
pnpm run probe     # 版式、交互与双语一致性探针（需要 Edge 或 Chrome）
pnpm run shots     # 给构建产物拍图 → shots/
```

`probe` 与 `shots` 用 Node 自带的 WebSocket 直接说 CDP，不需要 puppeteer。
Node 需要 22 以上；浏览器默认找 Edge，也可以用 `EDGE_PATH` 指定。

> `astro check` 目前不支持 TypeScript 7，所以 `typescript` 钉在 6.x。

## 目录

```
src/
├── content/docs/
│   ├── zh/*.mdx           中文正文
│   └── en/*.mdx           英文正文（文件名必须与中文一致）
├── layouts/
│   ├── BaseLayout.astro   壳：head、首帧主题、hreflang、顶栏、页脚、搜索框
│   └── DocLayout.astro    文档三栏：左目录 / 正文 / 本页目录
├── components/            顶栏、侧栏、本页目录、翻页、首页、Callout、Figure、Kbd、搜索
├── lib/
│   ├── i18n.ts            语言常量、分组顺序、全部 UI 文案、路径与 alternate 助手
│   ├── docs.ts            内容集合读取、排序、阅读时长
│   ├── search.ts          搜索索引的构建
│   └── shiki-theme.ts     代码高亮配色
├── pages/                 首页、docs/[...slug]、404、sitemap、搜索索引；en/ 下是英文对应物
└── styles/
    ├── tokens.css         颜色与尺寸令牌（浅色 / 暗色各一套）
    ├── site.css           全部版式
    └── fonts.css          本地 woff2
public/                    图标、两张分享图、robots.txt、界面截图
scripts/                   探针、截图、分享图生成
```

## 加一篇文档

两种语言各写一份，**文件名必须相同**（文件名就是 slug）：

```mdx
---
title: 标题
description: 一句话说明，出现在文档头、搜索结果与首页索引里
group: 参考        # 中文：概览 / 上手 / 参考 / 深入
order: 3           # 组内顺序
---

正文。
```

英文那份的 `group` 用 `Overview` / `Getting started` / `Reference` / `Internals`。
侧栏、翻页、首页索引、搜索索引、sitemap 与 hreflang 都会自动带上它 —— 不需要改别的地方。

正文里可以直接用三个组件（不用 import）：

| 组件 | 用法 |
| --- | --- |
| `<Callout tone="note\|warn\|pitfall\|verified" label="…">` | 侧注；`pitfall` 是朱红左边线，`verified` 是绿色 |
| `<Figure src="/shots/x.png" alt="…" caption="…" />` | 截图，编号自动递增 |
| `<Kbd>Ctrl</Kbd>` | 键帽 |

图片放在 `public/shots/`，引用写 `/shots/文件名`。站内链接要写对应语言的路径：
中文页写 `/docs/x`，英文页写 `/en/docs/x`。

## 截图

`public/shots/` 里的图来自应用仓库的 `docs/shots/` —— 那是 CDP 探针跑出来的整窗截图（1360×900），
比 README 里那几张精修图更「真」：状态栏、日志、错误横幅都在。正文用 `<Figure>` 引用，编号按页
自动递增（`图 01`），点图在新标签页看原图。目前 23 张分布在 10 个页面里。

## 设计约定

- **结构用线画，不用框画**：全站没有圆角卡片、没有投影、没有渐变。层次由字号、字重、留白和 1px 的线承担。
- **一个主色**：朱红 `#c23327` 只用在标记、链接悬停与左边线上，其余全靠墨色浓淡。
- **暗色不是反色**：换成更暗的纸 `#17140f`，保留同样的线宽与对比关系 —— 纯黑底会让 1px 的线消失。
- **h2 的编号挂在左侧边栏**里，窄屏收起。编号由 CSS counter 生成，正文里不用手写。
- **中英各自的行高**：中文 1.85，英文收到 1.72（`html[lang='en']` 覆盖），拉丁文按中文行高排会显散。
- 字体与[应用本体](https://github.com/hmilyld/SealPack)同一套：Instrument Sans + JetBrains Mono，
  中文回落到系统字体。

## 校验

```bash
pnpm run build
pnpm run probe
```

探针做三组事：

- **静态**：扫 `dist/` 里所有 `href`，核对内部链接与锚点；核对中英篇目一一对应；核对 sitemap 里有
  hreflang；
- **版式与交互**：量计算样式与几何 —— 无横向溢出、三栏宽度、图片加载、表格不撑破容器、可变字重是否
  真的生效、正文对比度、主题三态、搜索、滚动高亮、窄屏断点；
- **双语**：`<html lang>`、hreflang 互指、侧栏链接的语言前缀、语言切换按钮的落点、英文搜索返回 `/en`
  链接。

失败项会以退出码 1 结束。改过样式、组件或任何一篇文档之后跑一次，比截图目测可靠。

## 部署

托管在 **Vercel**，域名 `https://sealpack.hmilyld.com`。`vercel.json` 已经把构建链钉死：

| 项 | 值 |
| --- | --- |
| Framework | Astro（自动识别） |
| Install | `pnpm install --frozen-lockfile` |
| Build | `pnpm run build` |
| Output | `dist` |
| Node | ≥ 22（`package.json` 的 `engines`） |

在 Vercel 里 Import 这个仓库、确认上面几项、Deploy 即可，之后推 `main` 会自动发布。
`/docs` 与 `/en/docs` 两条入口用 `vercel.json` 的 308 跳转；`astro.config.mjs` 里的同名
`redirects` 保留着，是为了本地 `astro dev` 与其它静态托管也能用。

`_astro/*` 带内容哈希，设了一年 immutable 缓存；`shots/*` 是截图，一周。改这两条之前先想清楚
—— 文件名带哈希的才能 immutable。

域名那一侧：Cloudflare 里 `sealpack` 这条记录要指向 Vercel 给的 CNAME（`cname.vercel-dns.com`），
**首次签证书期间把代理关掉（灰云）**，证书签发后再决定要不要开回橙云（SSL 模式选 Full (strict)）。

`astro.config.mjs` 里的 `site` 与 `src/lib/site.ts` 里的 `url` 是同一个域名，改的时候两处一起改
（canonical、OG、sitemap 都用它）。

分享图由 `scripts/make-og.py` 生成（Pillow + 系统里的微软雅黑 / Segoe UI），
输出 `public/og.png` 与 `public/og-en.png`，改了文案重跑一次即可。
