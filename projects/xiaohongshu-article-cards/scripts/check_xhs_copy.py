#!/usr/bin/env python3
"""按保守口径校验小红书标题、正文、话题和必留链接。"""

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


def numbered_sections_have_blank_lines(text: str) -> bool:
    """检查第二个及后续数字分点前是否有空行。"""
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    matches = list(re.finditer(r"(?m)^\d+(?:[/.、])", normalized))
    return all(normalized[max(0, match.start() - 2) : match.start()] == "\n\n" for match in matches[1:])


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="校验小红书标题与正文")
    parser.add_argument("--title", required=True, help="小红书标题")
    parser.add_argument("--body-file", required=True, type=Path, help="UTF-8 正文文件")
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
    title_count = utf16_units(args.title)
    body_count = utf16_units(normalize_crlf(body))
    topics = find_topics(body)
    errors: list[str] = []

    if title_count >= 20:
        errors.append(f"标题为 {title_count} 个字符，必须少于 20")
    if body_count > 1000:
        errors.append(f"正文为 {body_count} 个字符，必须不超过 1000")
    if len(topics) != 5:
        errors.append(f"检测到 {len(topics)} 个话题，必须正好为 5 个")
    if len(set(topics)) != len(topics):
        errors.append("话题存在重复")
    if re.search(r"[①②③④⑤⑥⑦⑧⑨⑩]", body):
        errors.append("检测到带圈数字，请改用 1/2/3 等普通数字分点")
    if not numbered_sections_have_blank_lines(body):
        errors.append("数字分点之间缺少空行")

    for link in args.required_link:
        if link not in body:
            errors.append(f"缺少必留链接：{link}")

    print(f"标题字符：{title_count}/19")
    print(f"正文字符（UTF-16 + CRLF）：{body_count}/1000")
    print(f"话题数量：{len(topics)}/5")
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
