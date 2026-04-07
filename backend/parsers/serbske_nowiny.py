from __future__ import annotations

from parsers.common import parse_function


def parse_serbske_nowiny(html: str, min_text_length: int = 40) -> list[dict[str, str | int]]:
    selectors = [
        "main article",
        "article.post",
        "article",
        ".td-post-content",
        ".entry-content",
        ".post-content",
        "main",
        "body",
    ]
    return parse_function(html, candidate_selectors=selectors, min_text_length=min_text_length)
