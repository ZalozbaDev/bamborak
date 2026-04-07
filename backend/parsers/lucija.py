from __future__ import annotations

from parsers.common import parse_function


def parse_lucija(html: str, min_text_length: int = 40) -> list[dict[str, str | int]]:
    selectors = [
        "main article",
        "article",
        ".entry-content",
        ".elementor-widget-theme-post-content",
        ".post-content",
        "main",
        "body",
    ]
    return parse_function(html, candidate_selectors=selectors, min_text_length=min_text_length)
