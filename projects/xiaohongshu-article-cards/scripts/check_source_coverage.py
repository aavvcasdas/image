#!/usr/bin/env python3
"""检查必留内容是否出现在卡片 HTML 或文本中。"""

from __future__ import annotations

import argparse
import html
import re
import sys
from html.parser import HTMLParser
from pathlib import Path


class VisibleTextExtractor(HTMLParser):
    """提取 HTML 中的可见文字，忽略 style 与 script。"""

    BLOCK_TAGS = {
        "br",
        "div",
        "p",
        "section",
        "article",
        "li",
        "tr",
        "td",
        "th",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
    }

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"style", "script"}:
            self.skip_depth += 1
        elif self.skip_depth == 0 and tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"style", "script"} and self.skip_depth:
            self.skip_depth -= 1
        elif self.skip_depth == 0 and tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self.skip_depth == 0:
            self.parts.append(data)


def normalize(value: str, ignore_case: bool = False) -> str:
    value = html.unescape(value).replace("\u00a0", " ").replace("\u3000", " ")
    value = re.sub(r"\s+", " ", value).strip()
    return value.casefold() if ignore_case else value


def read_visible_text(path: Path) -> str:
    raw = path.read_text(encoding="utf-8-sig")
    if path.suffix.lower() not in {".html", ".htm"}:
        return raw
    parser = VisibleTextExtractor()
    parser.feed(raw)
    return "".join(parser.parts)


def main() -> int:
    parser = argparse.ArgumentParser(description="检查卡片是否覆盖必留内容清单。")
    parser.add_argument("--cards-file", required=True, type=Path, help="卡片 HTML 或纯文本文件")
    parser.add_argument("--required-file", required=True, type=Path, help="逐行列出必留内容的 UTF-8 文件")
    parser.add_argument("--ignore-case", action="store_true", help="比较英文时忽略大小写")
    args = parser.parse_args()

    if not args.cards_file.is_file():
        parser.error(f"卡片文件不存在：{args.cards_file}")
    if not args.required_file.is_file():
        parser.error(f"必留内容文件不存在：{args.required_file}")

    cards_text = normalize(read_visible_text(args.cards_file), args.ignore_case)
    required_lines = [
        line.strip()
        for line in args.required_file.read_text(encoding="utf-8-sig").splitlines()
        if line.strip()
    ]

    if not required_lines:
        print("错误：必留内容文件没有有效条目。", file=sys.stderr)
        return 2

    missing = [
        line
        for line in required_lines
        if normalize(line, args.ignore_case) not in cards_text
    ]

    print(f"必留条目：{len(required_lines)}")
    print(f"已覆盖：{len(required_lines) - len(missing)}")
    print(f"缺失：{len(missing)}")

    if missing:
        print("\n缺失内容：", file=sys.stderr)
        for item in missing:
            print(f"- {item}", file=sys.stderr)
        return 1

    print("内容覆盖校验通过。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
