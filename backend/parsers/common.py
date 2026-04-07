from __future__ import annotations

from bs4 import BeautifulSoup
from bs4.element import Tag

HEADING_TAGS = {"h1", "h2", "h3"}
TEXT_TAGS = {"p", "li", "blockquote", "pre"}


def _normalize_space(text: str) -> str:
    return " ".join(text.split()).strip()


def _remove_noise(container: Tag) -> None:
    for bad in container.select(
        "script, style, noscript, nav, header, footer, aside, form, iframe"
    ):
        bad.decompose()


def _pick_first_existing(soup: BeautifulSoup, selectors: list[str]) -> Tag | None:
    for selector in selectors:
        node = soup.select_one(selector)
        if node:
            return node
    return None


def _extract_sections(
    container: Tag,
    min_text_length: int = 40,
) -> list[dict[str, str | int]]:
    content_nodes = container.find_all(list(HEADING_TAGS | TEXT_TAGS))
    sections: list[dict[str, str | int]] = []

    current_title = ""
    current_level = 0
    current_parts: list[str] = []

    def flush_section() -> None:
        nonlocal current_title, current_level, current_parts

        if not current_title:
            current_parts = []
            return

        merged = _normalize_space(" ".join(current_parts))
        if len(merged) < min_text_length:
            current_parts = []
            return

        section: dict[str, str | int] = {
            "title": current_title,
            "text": merged,
        }

        sections.append(section)
        current_parts = []

    for node in content_nodes:
        if not isinstance(node, Tag):
            continue

        name = (node.name or "").lower()
        text = _normalize_space(node.get_text(" ", strip=True))

        if not text:
            continue

        if name in HEADING_TAGS:
            flush_section()
            current_title = text
            current_level = int(name[1])
            continue

        if name in TEXT_TAGS and current_title:
            current_parts.append(text)

    flush_section()
    return sections


def parse_function(
    html: str,
    candidate_selectors: list[str] | None = None,
    min_text_length: int = 40,
) -> list[dict[str, str | int]]:
    soup = BeautifulSoup(html, "lxml")

    selectors = candidate_selectors or [
        "main article",
        "article",
        "main",
        "[role='main']",
        ".entry-content",
        ".post-content",
        ".article-content",
        "body",
    ]

    container = _pick_first_existing(soup, selectors)
    if container is None:
        return []

    _remove_noise(container)
    return _extract_sections(container, min_text_length=min_text_length)
