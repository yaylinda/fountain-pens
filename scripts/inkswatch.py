import json
import logging
import re
import time
from typing import Dict, Iterable, Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

BASE = "https://inkswatch.com/"
SEARCH_ENDPOINT = urljoin(BASE, "getSearchResults.php")
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; InkFetcher/1.0)"}
HEX_RE = re.compile(r"#([0-9a-fA-F]{6})")


def fetch(
    url: str, *, params: Optional[dict] = None, timeout: float = 15.0
) -> requests.Response:
    """HTTP GET with retries and logging."""
    last_err = None
    for attempt in range(3):
        try:
            log.debug(f"Fetching {url} with params={params}, attempt={attempt+1}")
            resp = requests.get(url, params=params, headers=HEADERS, timeout=timeout)
            resp.raise_for_status()
            return resp
        except requests.RequestException as e:
            log.warning(f"Fetch failed (attempt {attempt+1}): {e}")
            last_err = e
            time.sleep(0.6)
    log.error(f"Failed to fetch {url} after retries")
    raise last_err  # type: ignore


def search_first_link_html(ink_name: str) -> Optional[str]:
    """Search InkSwatch and return first candidate link."""
    log.info(f"Searching for ink: {ink_name}")
    resp = fetch(SEARCH_ENDPOINT, params={"query": ink_name})
    soup = BeautifulSoup(resp.text, "html.parser")
    candidates = soup.select("p.searchModalLinks > a[href]")
    if not candidates:
        log.warning(f"No results found for {ink_name}")
        return None

    # Normalize function for matching
    norm = lambda s: re.sub(r"\s+", " ", s).strip().lower()
    target_norm = norm(ink_name)

    for a in candidates:
        if norm(a.get_text()) == target_norm:
            href = urljoin(BASE, a["href"])
            log.info(f"Found exact match link: {href}")
            return href

    href = urljoin(BASE, candidates[0]["href"])
    log.info(f"No exact match, using first candidate: {href}")
    return href


def parse_hex_from_ink_page(html: str) -> Optional[str]:
    """Extract hex code from page HTML if present."""
    soup = BeautifulSoup(html, "html.parser")
    span = soup.select_one("span#modalHexCode")
    if span and span.get_text():
        txt = span.get_text().strip()
        m = HEX_RE.search(txt)
        if m:
            return "#" + m.group(1).lower()

    m = HEX_RE.search(html)
    if m:
        return "#" + m.group(1).lower()
    return None


def get_hex_for_ink(ink_name: str) -> Dict[str, Optional[str]]:
    """End-to-end pipeline for one ink."""
    out = {"name": ink_name, "url": None, "hex": None, "note": None}
    link = search_first_link_html(ink_name)
    if not link:
        out["note"] = "no search results"
        return out
    out["url"] = link

    log.info(f"Fetching ink page: {link}")
    page = fetch(link).text
    hex_code = parse_hex_from_ink_page(page)
    if hex_code:
        log.info(f"Found hex for {ink_name}: {hex_code}")
        out["hex"] = hex_code
    else:
        log.warning(f"No hex found in static HTML for {ink_name}")
        out["note"] = "hex not found without JS"
    return out


def get_hex_for_inks(ink_names: Iterable[str]) -> Dict[str, Dict[str, Optional[str]]]:
    """Process a list of inks with logging."""
    results = {}
    for name in ink_names:
        try:
            log.info(f"--- Processing {name} ---")
            results[name] = get_hex_for_ink(name)
        except Exception as e:
            log.exception(f"Error while processing {name}")
            results[name] = {
                "name": name,
                "url": None,
                "hex": None,
                "note": f"error: {e!r}",
            }
        time.sleep(0.2)
    return results


if __name__ == "__main__":
    inks = [
        "Happy Holidays",
        "Jack Frost",
        "Polar Glow",
        "Winter Miracle",
        "Holly",
        "Blue Peppermint",
        "Garland",
        "Subzero",
        "Winter Spice",
        "Arctic Blast",
        "Serendipity",
        "Spiced Apple",
        "Solar Storm",
        "Upon a Star",
        "Astral",
        "Glacier",
        "Raise A Glass",
        "Frosted Orchid",
        "Golden Ivy",
        "Golden Oasis",
        "Golden Sands",
        "Night Sky",
        "Pink Glitz",
        "Shimmering Seas",
        "Stroke of Midnight",
        "Emerald of Chivor",
        "Kyanite du Nepal",
        "Fuchsia de Magellan",
        "Rouge Hematite",
        "Sheen Machine 1",
        "Sheen Machine 2",
        "California Teal",
        "Nitrogen",
        "Walden",
        "Kon-Peki",
        "Hotaru-Bi",
        "Momiji",
        "Rose Gold Antiqua",
        "Violet Clouds",
        "Haha",
        "Koke",
        "Nekoyanagi",
        "Yuki-Akari",
        "Vesper Blue Bisperas 1669",
        "Jewel Green Parol 1908",
        "Cosmic Blue Shimmer Kosmos 1955",
        "Blue Blood Dugong Bughaw 1521",
        "Malayan Apple Makopa 1938",
        "Night Sky Tala 1980 [SAMPLE]",
        "Pastel Blue Julio 1991",
        "Plume Salimbay 1949",
        "Sea and Sky Lakbay 1861",
        "Sodalite Kislap 1891",
        "Parrot Fish",
        "Golden Lapis",
        "Bram Stoker Dracula",
        "Enki",
        "Wendy Darling",
        "A Little Princess",
        "Pinocchio",
        "20000 Leagues Under the Sea",
        "Hades",
        "The Glass Bead Game",
        "Paradiso",
        "Alice",
        "The Count of Monte Cristo",
        "Robinson Crusoe",
        "2024 Blue Dragon",
        "Quetzalcoatl",
        "Marley",
        "Salted Caramel",
        "Nutmeg",
        "Grotto",
        "Cosmic Glow",
        "Icy Lilac",
        "Sleigh Ride",
        "Noble Fir",
        "Chilly Nights",
        "Winterberry",
        "Wishing Tree",
        "Lemon and Lime",
        "Mint Twist",
        "Cranberry",
        "Pine Needle",
        "Snow Globe",
        "Baltic Breeze",
        "Potpourri",
        "Vibe",
        "Lullaby",
        "Blue",
        "Atlas",
        "Ama-Iro",
        "Asa-Gao",
        "Rikka",
        "Pastel Pink Julia 1991",
        "Shocking Blue",
        "Good Tidings",
        "Warfarer",
        "7 Colored Ocean",
        "Dewy Starlight",
        "A Watery Star",
        "Nadeshiko",
        "Ajisai",
        "Tsuki-Yo",
        "Neutron Star Twinkle",
        "Bonsai",
        "Quantum Teal",
        "Sterling Silver",
        "Aqueduct",
        "Dart Frog",
        "Suncatcher",
        "Tesla Coil",
        "Tiger Lily",
    ]
    data = get_hex_for_inks(inks)
    print(json.dumps(data, indent=2, ensure_ascii=False))
