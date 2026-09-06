"""Extract owned Pilot inks' Vanness observations for review, never edit inventory.

Usage: python3 scripts/pilot_reference.py > /tmp/pilot-observations.json
Pass --source-file to reprocess a saved Shopify collection response offline.
Descriptions and translations in the curated catalog require human review.
"""

import argparse
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "https://vanness1938.com/collections/pilot-inks/products.json?limit=250"


class ProductTable(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = {}
        self.cells = []
        self.cell = None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.cells = []
        elif tag in ("td", "th"):
            self.cell = []

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cell is not None:
            self.cells.append(" ".join("".join(self.cell).split()))
            self.cell = None
        elif tag == "tr" and len(self.cells) == 2:
            key, value = self.cells
            if key in self.rows:
                raise ValueError(f"Duplicate table field: {key}")
            self.rows[key] = value


def yes_no(value):
    if value not in ("Yes", "No"):
        raise ValueError(f"Unrecognized yes/no value: {value}")
    return value == "Yes"


def extract(product):
    parser = ProductTable()
    parser.feed(product["body_html"])
    fields = parser.rows
    dry_time = re.fullmatch(
        r"(\d+) [Ss]econds(?:\s*\(Pilot Vanishing Point Medium Nib on Rhodia Paper\)| in a Pilot VP medium nib on Rhodia)",
        fields["Dry Time"],
    )
    if not dry_time:
        raise ValueError(f"Unrecognized dry-time conditions: {fields['Dry Time']}")
    url = f"https://vanness1938.com/products/{product['handle']}"
    return {
        "sourceUrl": url,
        "countryOfOrigin": fields["Country of Origin"],
        "limitedEdition": yes_no(fields["Limited Edition"]),
        "writing": {
            "sourceUrl": url,
            "dryTimeSeconds": int(dry_time[1]),
            "testPen": "Pilot Vanishing Point, medium nib",
            "testPaper": "Rhodia",
            "flow": fields["Flow"].lower(),
            "shading": fields["Shading"].lower(),
            "sheen": fields["Sheen"],
            "shimmer": yes_no(fields["Shimmer"]),
            "waterResistance": fields["Water Resistance"].lower(),
            "ironGall": yes_no(fields["Iron Gall"]),
            "pigment": yes_no(fields["Pigment"]),
        },
    }


def normalize(value):
    return re.sub(r"[^a-z]", "", value.lower())


def scrape(products, inventory):
    result = []
    for ink in inventory:
        if ink["brand"].strip().lower() != "pilot":
            continue
        title = normalize(f"Pilot {ink['collection']} {ink['name']} Ink")
        matches = [p for p in products if normalize(p["title"]) == title]
        if len(matches) != 1:
            raise ValueError(f"Expected one exact product for {ink['name']}, found {len(matches)}")
        result.append({"inkId": ink["id"], "name": ink["name"], **extract(matches[0])})
    return result


def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("--source-file", type=Path)
    options = args.parse_args()
    if options.source_file:
        data = json.loads(options.source_file.read_text())
    else:
        with urllib.request.urlopen(SOURCE, timeout=30) as response:
            data = json.load(response)
    if len(data["products"]) >= 250:
        raise ValueError("Collection may be paginated; review before importing")
    inventory = json.loads((ROOT / "src/data/inks.json").read_text())
    print(json.dumps({
        "retrievedAt": datetime.now(timezone.utc).date().isoformat(),
        "source": SOURCE,
        "inks": scrape(data["products"], inventory),
    }, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
