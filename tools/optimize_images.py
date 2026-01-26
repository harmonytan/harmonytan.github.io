#!/usr/bin/env python3
"""
Optimize images (PNG/JPG) in-place or from a target file/dir.
Converts to JPG, resizes to a max dimension, and updates front matter references.
"""

from __future__ import annotations

import argparse
import re
import subprocess
from pathlib import Path
from typing import Iterable, List, Tuple

ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT / "posts"
INDEX_SCRIPT = ROOT / "tools" / "update_posts_index.py"

SUPPORTED_EXTS = {".png", ".jpg", ".jpeg"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Optimize images and update front matter references."
    )
    parser.add_argument(
        "targets",
        nargs="+",
        help="File or directory paths (relative to repo root or absolute).",
    )
    parser.add_argument(
        "--max-size",
        type=int,
        default=1200,
        help="Longest edge in pixels. Default: 1200",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=82,
        help="JPEG quality (0-100). Default: 82",
    )
    parser.add_argument(
        "--keep-original",
        action="store_true",
        help="Keep original files instead of deleting them.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show planned changes without modifying files.",
    )
    return parser.parse_args()


def resolve_targets(values: Iterable[str]) -> List[Path]:
    targets: List[Path] = []
    for value in values:
        path = Path(value)
        if not path.is_absolute():
            path = (ROOT / path).resolve()
        if not path.exists():
            raise SystemExit(f"Target not found: {value}")
        targets.append(path)
    return targets


def iter_images(targets: Iterable[Path]) -> List[Path]:
    images: List[Path] = []
    for target in targets:
        if target.is_dir():
            for path in target.rglob("*"):
                if path.suffix.lower() in SUPPORTED_EXTS and path.is_file():
                    images.append(path)
        elif target.is_file():
            if target.suffix.lower() in SUPPORTED_EXTS:
                images.append(target)
    return sorted(set(images))


def to_repo_rel(path: Path) -> str:
    try:
        return path.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def build_output_path(path: Path) -> Path:
    return path.with_suffix(".jpg")


def run_sips(input_path: Path, output_path: Path, max_size: int, quality: int) -> None:
    subprocess.run(
        [
            "sips",
            "-s",
            "format",
            "jpeg",
            "-s",
            "formatOptions",
            str(quality),
            "-Z",
            str(max_size),
            str(input_path),
            "--out",
            str(output_path),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
    )


def update_markdown_references(old_rel: str, new_rel: str, dry_run: bool) -> int:
    if not POSTS_DIR.exists():
        return 0
    updated = 0
    for path in POSTS_DIR.glob("*.md"):
        text = path.read_text(encoding="utf-8")
        replacement_map = {
            old_rel: new_rel,
            f"/{old_rel}": f"/{new_rel}",
        }
        new_text = text
        for before, after in replacement_map.items():
            new_text = new_text.replace(before, after)
        if new_text == text:
            continue
        updated += 1
        if dry_run:
            continue
        path.write_text(new_text, encoding="utf-8")
    return updated


def main() -> None:
    args = parse_args()
    targets = resolve_targets(args.targets)
    images = iter_images(targets)
    if not images:
        raise SystemExit("No supported images found.")

    changes: List[Tuple[Path, Path]] = []
    for image in images:
        output = build_output_path(image)
        changes.append((image, output))

    for src, dest in changes:
        if args.dry_run:
            print(f"[dry-run] {to_repo_rel(src)} -> {to_repo_rel(dest)}")
            continue
        run_sips(src, dest, args.max_size, args.quality)
        if not args.keep_original and src.resolve() != dest.resolve():
            src.unlink()

        old_rel = to_repo_rel(src)
        new_rel = to_repo_rel(dest)
        update_markdown_references(old_rel, new_rel, dry_run=False)

    if args.dry_run:
        return

    if INDEX_SCRIPT.exists():
        subprocess.run(
            ["python3", str(INDEX_SCRIPT)],
            check=True,
            stdout=subprocess.DEVNULL,
        )


if __name__ == "__main__":
    main()
