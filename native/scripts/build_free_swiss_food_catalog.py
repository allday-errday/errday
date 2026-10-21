#!/usr/bin/env python3
"""Build a parallel, free Swiss food catalogue without touching the app catalogue.

Sources:
- Complete Switzerland-tagged Open Food Facts Mirabelle export (ODbL 1.0)
- Swiss Food Composition Database v7.1 (free with attribution)

The output is a searchable SQLite preview. It is intentionally not written into
App/Resources and does not update Supabase or any other remote system.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import json
import math
import os
import re
import sqlite3
import tempfile
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OFF_BASE = "https://mirabelle.openfoodfacts.org/products"
BLV_URL = "https://naehrwertdaten.ch/wp-content/uploads/2026/07/Swiss_food_composition_database.xlsx"
OFF_COLUMNS = [
    "code", "product_name", "brands", "stores", "countries_tags", "quantity", "last_modified_t",
    "energy-kcal_100g", "energy-kj_100g", "energy_100g", "proteins_100g",
    "carbohydrates_100g", "fat_100g", "fiber_100g", "sugars_100g", "sodium_100g", "salt_100g",
]
RETAILERS = ("coop", "migros", "denner")
USER_AGENT = "Errday/0.2 (Swiss food catalogue prototype; https://www.errday.ch)"


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def download(url: str, destination: Path) -> None:
    temporary = destination.with_suffix(destination.suffix + ".download")
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Encoding": "identity"})
    with urllib.request.urlopen(request, timeout=300) as response, temporary.open("wb") as output:
        while block := response.read(1024 * 1024):
            output.write(block)
    temporary.replace(destination)


def source_urls() -> tuple[str, str]:
    sql = "select " + ",".join(f'\"{column}\"' for column in OFF_COLUMNS) + " from [all] where countries_tags like '%en:switzerland%'"
    csv_url = OFF_BASE + ".csv?" + urllib.parse.urlencode({"sql": sql, "_size": "max", "_stream": "on"})
    count_sql = "select count(*) as total from [all] where countries_tags like '%en:switzerland%'"
    count_url = OFF_BASE + ".json?" + urllib.parse.urlencode({"sql": count_sql, "_shape": "objects"})
    return csv_url, count_url


def ensure_sources(cache: Path, reuse: bool) -> tuple[Path, Path, Path, dict]:
    cache.mkdir(parents=True, exist_ok=True)
    off_csv = cache / "open-food-facts-switzerland.csv"
    off_count = cache / "open-food-facts-count.json"
    blv_xlsx = cache / "swiss-food-composition-database.xlsx"
    csv_url, count_url = source_urls()
    for url, path in ((csv_url, off_csv), (count_url, off_count), (BLV_URL, blv_xlsx)):
        if not reuse or not path.exists():
            print(f"Downloading {path.name} …", flush=True)
            download(url, path)
    count = json.loads(off_count.read_text())
    if not count.get("ok") or count.get("truncated") or not count.get("rows"):
        raise ValueError("Open Food Facts count query was not independently verified")
    audit = {
        "openFoodFactsCSV": csv_url,
        "openFoodFactsCount": count_url,
        "openFoodFactsCSV_SHA256": sha256(off_csv),
        "swissFoodCompositionURL": BLV_URL,
        "swissFoodCompositionSHA256": sha256(blv_xlsx),
    }
    return off_csv, off_count, blv_xlsx, audit


def number(value: object) -> float | None:
    try:
        parsed = float(str(value).strip().replace(",", "."))
        return parsed if math.isfinite(parsed) and parsed >= 0 else None
    except (TypeError, ValueError):
        return None


def iso_timestamp(value: object) -> str | None:
    try:
        return dt.datetime.fromtimestamp(float(str(value)), dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    except (TypeError, ValueError, OverflowError):
        return None


def barcode(value: object) -> str | None:
    candidate = str(value or "").strip()
    return candidate if candidate.isascii() and candidate.isdigit() and 4 <= len(candidate) <= 18 else None


def retailer_evidence(stores_value: str, brands_value: str) -> dict[str, str]:
    stores = {part.strip().casefold() for part in stores_value.split(",") if part.strip()}
    brands = {part.strip().casefold() for part in brands_value.split(",") if part.strip()}
    evidence = {retailer: "store" for retailer in RETAILERS if retailer in stores}
    if stores & {"coop pronto", "coop.ch", "coop@home"}:
        evidence["coop"] = "store"
    if "coop" not in evidence and any(
        brand in {"coop", "naturaplan", "prix garantie"} or brand.startswith("coop ") for brand in brands
    ):
        evidence["coop"] = "brand"
    if "denner" not in evidence and "denner" in brands:
        evidence["denner"] = "brand"
    return evidence


def nutrition_from_off(row: dict[str, str]) -> dict[str, float | None]:
    calories = number(row.get("energy-kcal_100g"))
    if calories is None:
        kj = number(row.get("energy-kj_100g"))
        if kj is None:
            kj = number(row.get("energy_100g"))
        if kj is not None:
            calories = kj / 4.184
    sodium = number(row.get("sodium_100g"))
    if sodium is not None:
        sodium *= 1000
    else:
        salt = number(row.get("salt_100g"))
        sodium = salt * 400 if salt is not None else None
    return {
        "calories": calories,
        "protein": number(row.get("proteins_100g")),
        "carbs": number(row.get("carbohydrates_100g")),
        "fat": number(row.get("fat_100g")),
        "fiber": number(row.get("fiber_100g")),
        "sugar": number(row.get("sugars_100g")),
        "sodium": sodium,
    }


def unit_from_quantity(quantity: str) -> str:
    return "ml" if re.fullmatch(r"\s*\d+(?:[.,]\d+)?\s*(?:ml|cl|dl|l)\s*", quantity, re.IGNORECASE) else "g"


def open_food_facts_rows(path: Path, expected_count: int, fetched_at: str, counts: Counter | None = None):
    counts = counts if counts is not None else Counter()
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != OFF_COLUMNS:
            raise ValueError(f"Unexpected Open Food Facts columns: {reader.fieldnames}")
        for row in reader:
            counts["sourceRows"] += 1
            code = barcode(row.get("code"))
            name = (row.get("product_name") or "").strip()
            if code is None:
                counts["rejectedBarcode"] += 1
                continue
            if not name:
                counts["rejectedName"] += 1
                continue
            nutrients = nutrition_from_off(row)
            if not any(value is not None for value in nutrients.values()):
                counts["rejectedNoNutrition"] += 1
                continue
            evidence = retailer_evidence(row.get("stores") or "", row.get("brands") or "")
            complete = all(nutrients[key] is not None for key in ("calories", "protein", "carbs", "fat"))
            counts["complete" if complete else "partial"] += 1
            if evidence:
                counts["retailerTagged"] += 1
            yield {
                "id": "gtin:" + code,
                "barcode": code,
                "name": name,
                "brand": (row.get("brands") or "").strip(),
                "category": None,
                "unit": unit_from_quantity(row.get("quantity") or ""),
                **nutrients,
                "source_id": "open_food_facts",
                "source_record_id": code,
                "source_url": "https://world.openfoodfacts.org/product/" + code,
                "source_updated_at": iso_timestamp(row.get("last_modified_t")),
                "fetched_at": fetched_at,
                "confidence": "community",
                "is_generic": 0,
                "retailers": evidence,
                "names": [],
            }
    if counts["sourceRows"] != expected_count:
        raise ValueError(f"Incomplete Open Food Facts export: {counts['sourceRows']} rows, expected {expected_count}")
    return counts


MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
OFFICE_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"


def column_index(reference: str) -> int:
    letters = re.match(r"[A-Z]+", reference)
    if not letters:
        raise ValueError(f"Invalid spreadsheet reference: {reference}")
    result = 0
    for character in letters.group():
        result = result * 26 + ord(character) - 64
    return result - 1


def xlsx_sheets(path: Path):
    with zipfile.ZipFile(path) as archive:
        shared: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared = ["".join(node.text or "" for node in item.iter(f"{{{MAIN_NS}}}t")) for item in root]
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {item.attrib["Id"]: item.attrib["Target"] for item in relationships}
        sheets = workbook.find(f"{{{MAIN_NS}}}sheets")
        if sheets is None:
            raise ValueError("Spreadsheet does not contain a sheets collection")
        for sheet in sheets:
            name = sheet.attrib["name"]
            target = targets[sheet.attrib[f"{{{OFFICE_REL_NS}}}id"]]
            if not target.startswith("xl/"):
                target = "xl/" + target.lstrip("/")
            root = ET.fromstring(archive.read(target))
            rows: list[list[str]] = []
            for row in root.findall(f".//{{{MAIN_NS}}}sheetData/{{{MAIN_NS}}}row"):
                values: list[str] = []
                for cell in row.findall(f"{{{MAIN_NS}}}c"):
                    index = column_index(cell.attrib["r"])
                    while len(values) <= index:
                        values.append("")
                    value_node = cell.find(f"{{{MAIN_NS}}}v")
                    if cell.attrib.get("t") == "inlineStr":
                        value = "".join(node.text or "" for node in cell.iter(f"{{{MAIN_NS}}}t"))
                    elif value_node is None:
                        value = ""
                    elif cell.attrib.get("t") == "s":
                        value = shared[int(value_node.text or "0")]
                    else:
                        value = value_node.text or ""
                    values[index] = value
                rows.append(values)
            yield name, rows


def swiss_food_composition_rows(path: Path, fetched_at: str, counts: Counter | None = None):
    nutrient_headers = {
        "calories": "Energy, kilocalories (kcal)",
        "protein": "Protein (g)",
        "carbs": "Carbohydrates, available (g)",
        "fat": "Fat, total (g)",
        "fiber": "Dietary fibres (g)",
        "sugar": "Sugars (g)",
        "sodium": "Sodium (Na) (mg)",
    }
    counts = counts if counts is not None else Counter()
    for sheet_name, rows in xlsx_sheets(path):
        if sheet_name not in {"Generic Foods", "Branded foods"}:
            continue
        if len(rows) < 3:
            raise ValueError(f"Swiss composition sheet {sheet_name} is empty")
        header_position = next((index for index, row in enumerate(rows) if row and row[0] == "ID"), None)
        if header_position is None:
            raise ValueError(f"Swiss composition sheet {sheet_name} has no recognised header")
        header = rows[header_position]
        indexes = {name: header.index(label) for name, label in nutrient_headers.items()}
        indexes.update(id=header.index("ID"), name=header.index("Name"), synonyms=header.index("Synonyms"), category=header.index("Category"))
        for row in rows[header_position + 1:]:
            counts["sourceRows"] += 1
            source_id = row[indexes["id"]].strip() if len(row) > indexes["id"] else ""
            name = row[indexes["name"]].strip() if len(row) > indexes["name"] else ""
            if not source_id or not name:
                counts["rejectedNameOrID"] += 1
                continue
            nutrients = {key: number(row[index]) if len(row) > index else None for key, index in indexes.items() if key in nutrient_headers}
            if not any(value is not None for value in nutrients.values()):
                counts["rejectedNoNutrition"] += 1
                continue
            complete = all(nutrients[key] is not None for key in ("calories", "protein", "carbs", "fat"))
            counts["complete" if complete else "partial"] += 1
            synonyms = row[indexes["synonyms"]].strip() if len(row) > indexes["synonyms"] else ""
            yield {
                "id": "blv:" + source_id,
                "barcode": None,
                "name": name,
                "brand": "" if sheet_name == "Generic Foods" else "Swiss Food Composition Database",
                "category": row[indexes["category"]].strip() if len(row) > indexes["category"] else None,
                "unit": "g",
                **nutrients,
                "source_id": "swiss_food_composition",
                "source_record_id": source_id,
                "source_url": "https://www.naehrwertdaten.ch/en/",
                "source_updated_at": "2026-07-01T00:00:00Z",
                "fetched_at": fetched_at,
                "confidence": "official",
                "is_generic": 1 if sheet_name == "Generic Foods" else 0,
                "retailers": {},
                "names": [("en", "synonym", item.strip()) for item in re.split(r"[;,]", synonyms) if item.strip()],
            }
    return counts


SCHEMA = """
pragma foreign_keys = on;
create table sources (
    id text primary key,
    title text not null,
    license_name text not null,
    license_url text not null,
    attribution text not null
);
create table products (
    id text primary key,
    barcode text unique,
    name text not null,
    brand text not null default '',
    category text,
    unit text not null check (unit in ('g', 'ml')),
    calories real, protein real, carbs real, fat real, fiber real, sugar real, sodium real,
    source_id text not null references sources(id),
    source_record_id text not null,
    source_url text not null,
    source_updated_at text,
    fetched_at text not null,
    confidence text not null check (confidence in ('official', 'community', 'verified_label', 'provisional')),
    is_generic integer not null check (is_generic in (0, 1))
);
create table product_names (
    product_id text not null references products(id) on delete cascade,
    language text not null,
    kind text not null,
    name text not null,
    primary key (product_id, language, kind, name)
);
create table product_retailers (
    product_id text not null references products(id) on delete cascade,
    retailer text not null,
    evidence text not null check (evidence in ('store', 'brand', 'licensed_feed', 'user_report')),
    primary key (product_id, retailer)
);
create table import_runs (
    generated_at text primary key,
    report_json text not null
);
create index products_barcode_index on products(barcode) where barcode is not null;
create index products_source_index on products(source_id, source_record_id);
create index products_name_index on products(name collate nocase);
create virtual table product_search using fts5(product_id unindexed, name, brand, aliases, tokenize='unicode61 remove_diacritics 2');
"""


def insert_product(connection: sqlite3.Connection, product: dict) -> bool:
    existing = connection.execute("select source_updated_at from products where id = ?", (product["id"],)).fetchone()
    if existing and (existing[0] or "") > (product["source_updated_at"] or ""):
        return False
    if existing:
        connection.execute("delete from product_search where product_id = ?", (product["id"],))
        connection.execute("delete from products where id = ?", (product["id"],))
    columns = (
        "id", "barcode", "name", "brand", "category", "unit", "calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium",
        "source_id", "source_record_id", "source_url", "source_updated_at", "fetched_at", "confidence", "is_generic",
    )
    connection.execute(
        f"insert into products ({','.join(columns)}) values ({','.join('?' for _ in columns)})",
        tuple(product[column] for column in columns),
    )
    for language, kind, name in product["names"]:
        connection.execute("insert or ignore into product_names values (?, ?, ?, ?)", (product["id"], language, kind, name))
    for retailer, evidence in product["retailers"].items():
        connection.execute("insert or replace into product_retailers values (?, ?, ?)", (product["id"], retailer, evidence))
    aliases = " ".join(name for _, _, name in product["names"])
    connection.execute("insert into product_search values (?, ?, ?, ?)", (product["id"], product["name"], product["brand"], aliases))
    return True


def current_catalog_comparison(connection: sqlite3.Connection) -> dict:
    path = ROOT / "App/Resources/food-catalog.json"
    if not path.exists():
        return {}
    current = json.loads(path.read_text())
    barcodes = set()
    for product in current.get("products", []):
        barcodes.add(str(product.get("id", "")))
        barcodes.update(str(item) for item in product.get("barcodeAliases", []))
    matched = sum(
        1 for (code,) in connection.execute("select barcode from products where barcode is not null") if code in barcodes
    )
    return {
        "currentProducts": len(current.get("products", [])),
        "currentSearchableBarcodes": len(barcodes),
        "previewBarcodesAlreadyInCurrent": matched,
        "previewBarcodesNewToCurrent": connection.execute("select count(*) from products where barcode is not null").fetchone()[0] - matched,
    }


def build_database(output: Path, off_csv: Path, off_count: Path, blv_xlsx: Path, audit: dict, replace: bool) -> dict:
    if output.exists() and not replace:
        raise FileExistsError(f"Refusing to overwrite {output}; pass --replace-preview to rebuild this preview")
    output.parent.mkdir(parents=True, exist_ok=True)
    count_payload = json.loads(off_count.read_text())
    expected = int(count_payload["rows"][0]["total"])
    generated_at = utc_now()
    temporary = output.with_suffix(output.suffix + ".tmp")
    if temporary.exists():
        temporary.unlink()
    connection = sqlite3.connect(temporary)
    try:
        connection.executescript(SCHEMA)
        connection.executemany("insert into sources values (?, ?, ?, ?, ?)", [
            ("open_food_facts", "Open Food Facts", "ODbL 1.0", "https://opendatacommons.org/licenses/odbl/1-0/", "Open Food Facts contributors"),
            ("swiss_food_composition", "Swiss Food Composition Database", "Free use with attribution", "https://www.naehrwertdaten.ch/en/downloads/", "Swiss Food Composition Database, Federal Food Safety and Veterinary Office"),
        ])
        off_counts = Counter()
        off_iterator = open_food_facts_rows(off_csv, expected, generated_at, off_counts)
        inserted_off = sum(1 for product in off_iterator if insert_product(connection, product))
        blv_counts = Counter()
        blv_iterator = swiss_food_composition_rows(blv_xlsx, generated_at, blv_counts)
        inserted_blv = sum(1 for product in blv_iterator if insert_product(connection, product))
        totals = dict(connection.execute("select source_id, count(*) from products group by source_id"))
        complete = connection.execute(
            "select count(*) from products where calories is not null and protein is not null and carbs is not null and fat is not null"
        ).fetchone()[0]
        report = {
            "schemaVersion": 1,
            "generatedAt": generated_at,
            "status": "parallel preview; not connected to the app or Supabase",
            "products": connection.execute("select count(*) from products").fetchone()[0],
            "barcodedProducts": connection.execute("select count(*) from products where barcode is not null").fetchone()[0],
            "genericProducts": connection.execute("select count(*) from products where is_generic = 1").fetchone()[0],
            "completeMacros": complete,
            "partialMacros": connection.execute("select count(*) from products").fetchone()[0] - complete,
            "retailerTaggedProducts": connection.execute("select count(distinct product_id) from product_retailers").fetchone()[0],
            "sourceProducts": totals,
            "sourceRows": {"openFoodFacts": off_counts["sourceRows"], "swissFoodComposition": blv_counts["sourceRows"]},
            "inserted": {"openFoodFacts": inserted_off, "swissFoodComposition": inserted_blv},
            "sourceAudit": {
                "openFoodFacts": dict(off_counts),
                "swissFoodComposition": dict(blv_counts),
            },
            "audit": audit,
        }
        report["currentCatalogComparison"] = current_catalog_comparison(connection)
        connection.execute("insert into import_runs values (?, ?)", (generated_at, json.dumps(report, sort_keys=True)))
        connection.commit()
        integrity = connection.execute("pragma integrity_check").fetchone()[0]
        if integrity != "ok":
            raise ValueError(f"SQLite integrity check failed: {integrity}")
    except Exception:
        connection.close()
        temporary.unlink(missing_ok=True)
        raise
    connection.close()
    temporary.replace(output)
    report["databaseBytes"] = output.stat().st_size
    report["databaseSHA256"] = sha256(output)
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", type=Path, required=True, help="Directory for verified source downloads")
    parser.add_argument("--output", type=Path, required=True, help="Parallel SQLite preview path; never use App/Resources/food-catalog.json")
    parser.add_argument("--reuse-downloads", action="store_true")
    parser.add_argument("--replace-preview", action="store_true")
    parser.add_argument("--report", type=Path, help="Optional JSON report path")
    args = parser.parse_args()
    current_catalog = (ROOT / "App/Resources/food-catalog.json").resolve()
    if args.output.resolve() == current_catalog:
        raise ValueError("The preview builder will not replace the current app catalogue")
    off_csv, off_count, blv_xlsx, audit = ensure_sources(args.cache, args.reuse_downloads)
    report = build_database(args.output, off_csv, off_count, blv_xlsx, audit, args.replace_preview)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        temporary = args.report.with_suffix(args.report.suffix + ".tmp")
        temporary.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        temporary.replace(args.report)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
