#!/usr/bin/env python3
"""
Scan the posts/ directory, read Markdown front matter, and regenerate data/posts.json.
The output is an array of slugs sorted by date (newest first), falling back to slug.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT / "posts"
OUTPUT_PATH = ROOT / "data" / "posts.json"


@dataclass
class PostMeta:
    slug: str
    date: datetime | None


def main() -> None:
    if not POSTS_DIR.exists():
        raise SystemExit(f"Posts directory not found: {POSTS_DIR}")

    posts: List[PostMeta] = []

    for path in POSTS_DIR.glob("*.md"):
        slug = path.stem
        attributes, _ = parse_front_matter(path.read_text(encoding="utf-8"))
        posts.append(PostMeta(slug=slug, date=parse_date(attributes.get("date"))))

    posts.sort(key=lambda post: (_sort_key(post.date), post.slug))
    posts.reverse()

    slugs = [post.slug for post in posts]
    OUTPUT_PATH.write_text(json.dumps(slugs, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {OUTPUT_PATH} with {len(slugs)} post(s).")


def parse_front_matter(source: str) -> Tuple[Dict[str, str], str]:
    if not source.startswith("---\n"):
        return {}, source

    try:
        _, rest = source.split("---\n", 1)
        front_matter, body = rest.split("\n---", 1)
    except ValueError:
        return {}, source

    attributes: Dict[str, str] = {}
    for line in front_matter.splitlines():
        cleaned = line.strip()
        if not cleaned or cleaned.startswith("#"):
            continue
        if ":" not in cleaned:
            continue
        key, value = cleaned.split(":", 1)
        attributes[key.strip()] = value.strip()

    if body.startswith("\n"):
        body = body[1:]

    return attributes, body


def parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        try:
            return datetime.strptime(value, "%Y-%m-%d")
        except ValueError:
            return None


def _sort_key(value: datetime | None) -> float:
    return value.timestamp() if value else float("-inf")


if __name__ == "__main__":
    main()
