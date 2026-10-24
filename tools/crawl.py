#!/usr/bin/env python3
"""Polite snapshot of castlespalv.com via the public WordPress REST API.

Saves JSON to content/ and downloads referenced media to media/.
Throttled (DELAY seconds between requests) and backs off on HTTP 429 so the
host's rate limiter is not tripped again. Safe to re-run: existing files skip.
"""
import json, os, re, sys, time, urllib.request, urllib.error

BASE = "https://castlespalv.com"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT, MEDIA = os.path.join(ROOT, "content"), os.path.join(ROOT, "media")
DELAY = 1.5
UA = "Mozilla/5.0 (compatible; CastleSpaLV-migration/1.0)"
_last = 0.0


def get(url, binary=False):
    global _last
    for attempt in range(6):
        wait = DELAY - (time.time() - _last)
        if wait > 0:
            time.sleep(wait)
        _last = time.time()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                body = r.read()
                return body if binary else (body.decode("utf-8"), r.headers)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                back = 30 * (attempt + 1)
                print(f"  429 on {url} - backing off {back}s", flush=True)
                time.sleep(back)
                continue
            if e.code in (400, 401, 403, 404):
                return None
            raise
        except (TimeoutError, OSError) as e:
            print(f"  network error on {url} ({e.__class__.__name__}) - retry {attempt + 1}", flush=True)
            time.sleep(5 * (attempt + 1))
    print(f"  GAVE UP on {url}", flush=True)
    return None


def rest_all(route, fields=None):
    out, page = [], 1
    while True:
        q = f"?per_page=100&page={page}" + (f"&_fields={fields}" if fields else "")
        res = get(f"{BASE}/wp-json/{route}{q}")
        if res is None:
            break
        body, headers = res
        items = json.loads(body)
        out += items
        if page >= int(headers.get("X-WP-TotalPages", 1)):
            break
        page += 1
    return out


# API keys the old theme baked into page HTML (e.g. a Mapbox token). They are
# public on the live site, but they have no place in this repository.
TOKEN_RE = re.compile(r"\b(?:pk|sk)\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+")


def save(name, data):
    text = TOKEN_RE.sub("[REDACTED_TOKEN]", json.dumps(data, ensure_ascii=False, indent=2))
    with open(os.path.join(CONTENT, name), "w", encoding="utf-8") as f:
        f.write(text)
    print(f"saved content/{name}: {len(data) if hasattr(data, '__len__') else ''}", flush=True)


def main():
    os.makedirs(CONTENT, exist_ok=True)
    os.makedirs(MEDIA, exist_ok=True)

    # discover every public post type instead of guessing
    types = json.loads(get(f"{BASE}/wp-json/wp/v2/types")[0])
    skip = {"attachment", "wp_block", "wp_template", "wp_template_part",
            "wp_navigation", "wp_font_family", "wp_font_face", "wp_global_styles",
            "nav_menu_item", "elementor_library", "e-floating-buttons"}
    for slug, t in types.items():
        if slug in skip:
            continue
        route = t["rest_base"]
        items = rest_all(f"wp/v2/{route}")
        if items:
            save(f"{route}.json", items)

    for tax in ("categories", "tags", "product_cat", "product_tag", "events_category"):
        items = rest_all(f"wp/v2/{tax}")
        if items:
            save(f"tax_{tax}.json", items)

    # WooCommerce public Store API (prices, images, stock) - no auth needed
    prods = rest_all("wc/store/v1/products")
    if prods:
        save("wc_products.json", prods)

    media = rest_all("wp/v2/media", "id,slug,source_url,alt_text,mime_type,media_details")
    if media:
        save("media_index.json", media)

    # download every image referenced anywhere in the saved content, plus the media library
    urls = set(m["source_url"] for m in media if m.get("source_url"))
    for fn in os.listdir(CONTENT):
        txt = open(os.path.join(CONTENT, fn), encoding="utf-8").read().replace("\\/", "/")
        urls |= set(re.findall(r'https://castlespalv\.com/wp-content/uploads/[^\s"\'\\)<>]+\.(?:jpe?g|png|gif|webp|svg)', txt))
    # skip generated thumbnails like name-300x200.jpg when the original is present
    thumb = re.compile(r"-\d+x\d+\.(jpe?g|png|gif|webp)$", re.I)
    originals = {u for u in urls if not thumb.search(u)}
    todo = sorted(originals)
    print(f"downloading {len(todo)} images", flush=True)
    for i, u in enumerate(todo, 1):
        rel = u.split("/wp-content/uploads/", 1)[1]
        dest = os.path.join(MEDIA, rel)
        if os.path.exists(dest):
            continue
        data = get(u, binary=True)
        if data:
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, "wb") as f:
                f.write(data)
        if i % 25 == 0:
            print(f"  {i}/{len(todo)}", flush=True)
    print("done", flush=True)


if __name__ == "__main__":
    sys.exit(main())
