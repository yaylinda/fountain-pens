import csv
import json
import pathlib
import re
import json
import time
import logging
from typing import Iterable, Dict, Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Logging
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
    last_err = None
    for attempt in range(3):
        try:
            log.debug(f"GET {url} params={params} attempt={attempt+1}")
            r = requests.get(url, params=params, headers=HEADERS, timeout=timeout)
            r.raise_for_status()
            return r
        except requests.RequestException as e:
            last_err = e
            log.warning(f"GET failed (attempt {attempt+1}): {e}")
            time.sleep(0.6)
    log.error(f"GET failed after retries: {url}")
    raise last_err  # type: ignore


def search_first_link_html(ink_name: str) -> Optional[str]:
    log.info(f"Searching: {ink_name}")
    resp = fetch(SEARCH_ENDPOINT, params={"query": ink_name})
    soup = BeautifulSoup(resp.text, "html.parser")
    links = soup.select("p.searchModalLinks > a[href]")
    if not links:
        log.warning(f"No results: {ink_name}")
        return None

    norm = lambda s: re.sub(r"\s+", " ", s).strip().lower()
    target = norm(ink_name)

    for a in links:
        if norm(a.get_text()) == target:
            href = urljoin(BASE, a["href"])
            log.info(f"Exact match: {href}")
            return href

    href = urljoin(BASE, links[0]["href"])
    log.info(f"Using first candidate: {href}")
    return href


def get_hex_with_selenium(ink_url: str) -> Optional[str]:
    log.info(f"Opening ink page in Selenium: {ink_url}")

    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1200,1600")
    driver = webdriver.Chrome(options=options)

    try:
        driver.get(ink_url)

        # Derive inkId from URL if present (ink.html?inkId=2346). Fallback: parse any tile.
        m = re.search(r"[?&]inkId=(\d+)\b", ink_url)
        if m:
            ink_id = m.group(1)
            selector = f"div#ink{ink_id}.single_fpink_box"
            log.info(f"Clicking selector: {selector}")
            tile = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
            )
            tile.click()
        else:
            log.info("inkId not in URL; clicking first .single_fpink_box")
            tile = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "div.single_fpink_box"))
            )
            tile.click()

        # Wait for modal hex code to appear
        hex_el = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "span#modalHexCode"))
        )
        txt = hex_el.text.strip()
        m2 = HEX_RE.search(txt)
        if m2:
            hex_code = "#" + m2.group(1).lower()
            log.info(f"Hex found: {hex_code}")
            return hex_code

        # Fallback: scan modal HTML textContent for any hex
        modal = hex_el.find_element(
            By.XPATH,
            "./ancestor::*[contains(@class,'modal') or contains(@class,'show')][1]",
        )
        modal_html = modal.get_attribute("innerText") or ""
        m3 = HEX_RE.search(modal_html)
        if m3:
            hex_code = "#" + m3.group(1).lower()
            log.info(f"Hex found (fallback): {hex_code}")
            return hex_code

        log.warning("Hex not found in modal")
        return None
    finally:
        driver.quit()


def get_hex_for_ink(ink_name: str) -> Dict[str, Optional[str]]:
    out = {"name": ink_name, "url": None, "hex": None, "note": None}
    link = search_first_link_html(ink_name)
    if not link:
        out["note"] = "no search results"
        return out
    out["url"] = link

    try:
        hex_code = get_hex_with_selenium(link)
        if hex_code:
            out["hex"] = hex_code
        else:
            out["note"] = "modal hex not found"
    except Exception as e:
        log.exception(f"Selenium error for {ink_name}")
        out["note"] = f"selenium error: {e!r}"
    return out


def get_hex_for_inks(ink_names: Iterable[str]) -> Dict[str, Dict[str, Optional[str]]]:
    results = {}
    for name in ink_names:
        log.info(f"--- {name} ---")
        try:
            results[name] = get_hex_for_ink(name)
        except Exception as e:
            log.exception(f"Error: {name}")
            results[name] = {
                "name": name,
                "url": None,
                "hex": None,
                "note": f"error: {e!r}",
            }
        time.sleep(0.2)
    return results


if __name__ == "__main__":
    import pathlib

    inks_file = pathlib.Path(__file__).parent / "inkNames.json"

    with open(inks_file, "r", encoding="utf-8") as f:
        inks = json.load(f)

    data = get_hex_for_inks(inks)

    # Save JSON (optional)
    with open("output.json", "w", encoding="utf-8") as jf:
        json.dump(data, jf, indent=2, ensure_ascii=False)

    # Save CSV
    with open("output.csv", "w", encoding="utf-8", newline="") as cf:
        writer = csv.writer(cf)
        writer.writerow(["name", "url", "hex", "note"])  # header
        for ink, record in data.items():
            writer.writerow(
                [
                    record.get("name"),
                    record.get("url"),
                    record.get("hex"),
                    record.get("note"),
                ]
            )

    print("Wrote output.csv")
