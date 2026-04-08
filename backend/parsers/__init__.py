from parsers.common import parse_function
from parsers.lucija import parse_lucija
from parsers.katolski_posol_html import parse_katolski_posol_html
from parsers.pfarrei_crostwitz import parse_pfarrei_crostwitz
from parsers.posol import parse_posol
from parsers.serbske_nowiny import parse_serbske_nowiny
from parsers.zalozba import parse_zalozba
from parsers.mdr_serbski import parse_mdr_serbski

__all__ = [
    "parse_function",
    "parse_lucija",
    "parse_katolski_posol_html",
    "parse_pfarrei_crostwitz",
    "parse_posol",
    "parse_serbske_nowiny",
    "parse_zalozba",
    "parse_mdr_serbski",
]
