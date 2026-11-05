"""
生成分享卡片 public/og.png 与 public/og-en.png（1200×630）。

和站点用同一套东西：纸白底、Fluent 蓝方块、等宽字的元信息行。
版本号从 src/lib/site.ts 读，避免再出现卡片写着旧版本的情况。
中文用系统里的微软雅黑（打包字体没有 CJK 字形），英文用 Segoe UI。
"""
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = Path("C:/Windows/Fonts")

W, H = 1200, 630
PAPER = (247, 244, 238)
INK = (23, 19, 15)
INK2 = (61, 55, 47)
MUTED = (109, 100, 87)
FAINT = (116, 107, 93)
RULE = (222, 213, 198)
ACCENT = (15, 108, 189)

SITE_TEXT = (ROOT / "src" / "lib" / "site.ts").read_text(encoding="utf-8")
VERSION = re.search(r"version:\s*'([^']+)'", SITE_TEXT).group(1)

CARDS = {
    "og.png": {
        "bold": ("msyhbd.ttc", 64),
        "regular": ("msyh.ttc", 26),
        "line1": "把三个命令行工具",
        "line2": "收进一个窗口",
        "tagline": "程序合并 / 加密 / 打包工作台",
        "meta": [f"v{VERSION}", "Windows 10 / 11", "MIT"],
    },
    "og-en.png": {
        "bold": ("segoeuib.ttf", 62),
        "regular": ("segoeui.ttf", 26),
        "line1": "Three command-line tools,",
        "line2": "one window",
        "tagline": "Merge, encrypt and package — one workbench",
        "meta": [f"v{VERSION}", "Windows 10 / 11", "MIT"],
    },
}


def font(name: str, size: int, index: int = 0) -> ImageFont.FreeTypeFont:
    candidate = FONTS / name
    if candidate.exists():
        return ImageFont.truetype(str(candidate), size, index=index)
    return ImageFont.load_default(size)


def tracked(draw, xy, text, fnt, fill, tracking=3):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + tracking


for filename, card in CARDS.items():
    bold = font(*card["bold"])
    regular = font(*card["regular"])
    mono = font("consola.ttf", 20)
    mono_small = font("consola.ttf", 18)

    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)

    # 边框：一圈 1px 的墨线，像印刷品的内框
    d.rectangle([32, 32, W - 33, H - 33], outline=RULE, width=1)

    # 顶部标记
    d.rectangle([80, 84, 92, 96], fill=ACCENT)
    tracked(d, (106, 78), "SEALPACK / DOCS", mono, MUTED, tracking=4)

    # 标题
    d.text((78, 152), card["line1"], font=bold, fill=INK)
    d.text((78, 240), card["line2"], font=bold, fill=MUTED)

    # 分隔线
    d.line([80, 366, W - 80, 366], fill=RULE, width=1)

    d.text((78, 396), card["tagline"], font=regular, fill=INK2)

    # 底部元信息
    x = 80
    for i, item in enumerate(card["meta"]):
        if i:
            d.text((x, H - 92), "·", font=mono_small, fill=RULE)
            x += 18
        d.text((x, H - 92), item, font=mono_small, fill=FAINT)
        x += d.textlength(item, font=mono_small) + 20

    url = "sealpack.hmilyld.com"
    d.text((W - 80 - d.textlength(url, font=mono_small), H - 92), url, font=mono_small, fill=FAINT)

    out = ROOT / "public" / filename
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, optimize=True)
    print(f"{out.name}  {W}×{H}  {out.stat().st_size // 1024} KB")
