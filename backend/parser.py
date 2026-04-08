from __future__ import annotations

import re
from typing import Callable
from urllib.parse import urlparse

import requests
from parsers import (
    parse_function,
    parse_lucija,
    parse_pfarrei_crostwitz,
    parse_posol,
    parse_serbske_nowiny,
    parse_zalozba,
    parse_katolski_posol_html,
)

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36 WebContentParser/1.0"
)

class InvalidUrlError(ValueError):
    pass


class FetchError(RuntimeError):
    def __init__(self, message: str, is_timeout: bool = False):
        super().__init__(message)
        self.is_timeout = is_timeout


def validate_url(url: str) -> str:
    cleaned = (url or "").strip()
    if not cleaned:
        raise InvalidUrlError("Invalid URL. Please provide a URL.")

    parsed = urlparse(cleaned)
    if parsed.scheme in {"http", "https"} and parsed.netloc:
        return cleaned

    # Accept inputs like "www.example.de" or "example.com" and normalize to https.
    if parsed.scheme == "" and parsed.netloc == "":
        host_candidate = parsed.path.split("/", 1)[0]
        domain_pattern = r"^(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$"
        if re.match(domain_pattern, host_candidate):
            normalized = f"https://{cleaned}"
            normalized_parsed = urlparse(normalized)
            if normalized_parsed.netloc:
                return normalized

    raise InvalidUrlError(
        "Invalid URL. Please use http(s)://..., www.example.de or example.de"
    )


def fetch_html(url: str, timeout: int = 12) -> str:
    validated_url = validate_url(url)

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "de,en-US;q=0.8,en;q=0.7",
    }

    try:
        response = requests.get(validated_url, headers=headers, timeout=timeout)
        response.raise_for_status()
    except requests.exceptions.Timeout as exc:
        raise FetchError("Request timeout while loading URL", is_timeout=True) from exc
    except requests.exceptions.RequestException as exc:
        raise FetchError(f"Could not fetch URL: {exc}") from exc

    content_type = response.headers.get("Content-Type", "")
    if "html" not in content_type.lower():
        raise FetchError("URL did not return an HTML document")

    return response.text


def _domain_from_url(url: str) -> str:
    parsed = urlparse(url)
    host = (parsed.netloc or parsed.path.split("/", 1)[0] or "").lower()
    if host.startswith("www."):
        host = host[4:]
    return host


def parse_content(url: str, html: str, min_text_length: int = 40) -> list[dict[str, str | int]]:
    normalized_url = url
    try:
        normalized_url = validate_url(url)
    except InvalidUrlError:
        pass

    domain = _domain_from_url(normalized_url)

    parser_by_domain: dict[str, Callable[..., list[dict[str, str | int]]]] = {
        "serbske-nowiny.de": parse_serbske_nowiny,
        "lucija.de": parse_lucija,
        "zalozba.de": parse_zalozba,
        "pfarrei-crostwitz.de": parse_pfarrei_crostwitz,
        "posol.de": parse_posol,
    }

    parser = None
    for key, parser_func in parser_by_domain.items():
        if domain == key or domain.endswith(f".{key}"):
            parser = parser_func
            break

    if parser is None:
      if "<title>" in html and "_KP_" in html and "_idContainer" in html:
        return parse_katolski_posol_html(html, min_text_length=min_text_length, url=url)
      return parse_function(html, url=normalized_url, min_text_length=min_text_length)

    return parser(html, min_text_length=min_text_length, url=normalized_url)
