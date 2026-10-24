"""Service menu, loaded from data/catalog.json.

The same JSON file is imported by the frontend at build time, so prices and
durations shown on the site are always the ones the API accepts.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

CATALOG_PATH = Path(__file__).parent / "data" / "catalog.json"


@dataclass(frozen=True)
class Option:
    minutes: int
    price_cents: int


@dataclass(frozen=True)
class Service:
    slug: str
    name: str
    category: str
    units: int
    options: tuple[Option, ...]

    def option(self, minutes: int) -> Option | None:
        return next((o for o in self.options if o.minutes == minutes), None)


@lru_cache
def raw_catalog() -> dict:
    return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))


@lru_cache
def services() -> dict[str, Service]:
    out: dict[str, Service] = {}
    for s in raw_catalog()["services"]:
        out[s["slug"]] = Service(
            slug=s["slug"],
            name=s["name"],
            category=s["category"],
            units=int(s.get("units", 1)),
            options=tuple(Option(o["minutes"], o["price_cents"]) for o in s["options"]),
        )
    return out


def business() -> dict:
    return raw_catalog()["business"]
