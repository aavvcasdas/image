#!/usr/bin/env python3
"""按保守口径校验快手发布文字、话题和必留链接。"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


def utf16_units(text: str) -> int:
    """返回 UTF-16 code unit 数，Emoji 通常按 2 个单元计算。"""
    return len(text.encode("utf-16-le")) // 2


def normalize_crlf(text: str) -> str:
    """统一为 CRLF，使用更保守的换行计数。"""
    return text.replace("\r\n", "\n").replace("\r", "\n").replace("\n", "\r\n")


def find_topics(text: str) -> list[str]:
    """提取以空白或行首开始的 #话题。"""
    return re.findall(r"(?m)(?:^|\s)#([^\s#]+)", text)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="校验快手发布文字")
    parser.add_argument("--body-file", required=True, type=Path, help="UTF-8 发布文字文件")
    parser.add_argument(
        "--required-link",
        action="append",
        default=[],
        help="必须原样保留的链接；可重复传入",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    body = args.body_file.read_text(encoding="utf-8-sig")
    body_count = utf16_units(normalize_crlf(body))
    topics = find_topics(body)
    errors: list[str] = []

    if body_count > 500:
        errors.append(f"发布文字为 {body_count} 个字符，必须不超过 500")
    if len(topics) > 4:
        errors.append(f"检测到 {len(topics)} 个话题，最多允许 4 个")
    if len(set(topics)) != len(topics):
        errors.append("话题存在重复")

    for link in args.required_link:
        if link not in body:
            errors.append(f"缺少必留链接：{link}")

    print(f"发布文字字符（UTF-16 + CRLF）：{body_count}/500")
    print(f"话题数量：{len(topics)}/4")
    print(f"必留链接：{len(args.required_link)} 个")

    if errors:
        print("校验失败：", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print("校验通过")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
