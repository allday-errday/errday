#!/usr/bin/env python3
"""Upload the native SQLite food catalog to its read-only Supabase mirror."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Iterable, Iterator


TABLES = (
    ("sources", "food_catalog_sources", "id"),
    ("products", "food_catalog_products", "id"),
    (
        "product_names",
        "food_catalog_names",
        "product_id,language,kind,name",
    ),
    ("product_retailers", "food_catalog_retailers", "product_id,retailer"),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, required=True)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--env-file", type=Path, default=Path(".env.local"))
    parser.add_argument("--batch-size", type=int, default=500)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip().strip("\"").strip("'")
        os.environ.setdefault(key.strip(), value)


def chunks(rows: Iterable[dict[str, Any]], size: int) -> Iterator[list[dict[str, Any]]]:
    batch: list[dict[str, Any]] = []
    for row in rows:
        batch.append(row)
        if len(batch) == size:
            yield batch
            batch = []
    if batch:
        yield batch


def rows_as_dicts(connection: sqlite3.Connection, table: str) -> Iterator[dict[str, Any]]:
    cursor = connection.execute(f"select * from {table}")
    columns = [item[0] for item in cursor.description]
    for values in cursor:
        row = dict(zip(columns, values))
        if table == "products":
            row["is_generic"] = bool(row["is_generic"])
        yield row


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


class SupabaseREST:
    def __init__(self, url: str, service_key: str) -> None:
        self.base_url = url.rstrip("/") + "/rest/v1"
        self.headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
            "User-Agent": "errday-food-catalog-sync/1.0",
        }

    def upsert(self, table: str, conflict_columns: str, rows: list[dict[str, Any]]) -> None:
        query = urllib.parse.urlencode({"on_conflict": conflict_columns}, safe=",")
        request = urllib.request.Request(
            f"{self.base_url}/{table}?{query}",
            data=json.dumps(rows, separators=(",", ":")).encode("utf-8"),
            headers=self.headers,
            method="POST",
        )
        for attempt in range(5):
            try:
                with urllib.request.urlopen(request, timeout=90) as response:
                    if response.status not in (200, 201, 204):
                        raise RuntimeError(f"unexpected HTTP status {response.status}")
                return
            except urllib.error.HTTPError as error:
                detail = error.read().decode("utf-8", errors="replace")[:1000]
                if error.code not in (429, 500, 502, 503, 504) or attempt == 4:
                    raise RuntimeError(
                        f"Supabase rejected {table} batch ({error.code}): {detail}"
                    ) from error
            except urllib.error.URLError as error:
                if attempt == 4:
                    raise RuntimeError(f"Supabase request failed for {table}: {error}") from error
            time.sleep(2**attempt)


def validate(connection: sqlite3.Connection, database: Path, report: dict[str, Any]) -> dict[str, int]:
    integrity = connection.execute("pragma integrity_check").fetchone()[0]
    if integrity != "ok":
        raise RuntimeError(f"SQLite integrity check failed: {integrity}")

    counts = {
        table: connection.execute(f"select count(*) from {table}").fetchone()[0]
        for table, _, _ in TABLES
    }
    database_hash = sha256(database)
    if report.get("products") != counts["products"]:
        raise RuntimeError("report product count does not match SQLite")
    if report.get("databaseSHA256") != database_hash:
        raise RuntimeError("report SHA-256 does not match SQLite")
    return counts


def main() -> int:
    args = parse_args()
    if args.batch_size < 1 or args.batch_size > 2000:
        raise SystemExit("--batch-size must be between 1 and 2000")

    database = args.database.resolve()
    report_path = (args.report or database.with_name("report.json")).resolve()
    report = json.loads(report_path.read_text(encoding="utf-8"))
    connection = sqlite3.connect(f"file:{database}?mode=ro", uri=True)
    counts = validate(connection, database, report)
    print(
        "validated "
        + ", ".join(f"{table}={count:,}" for table, count in counts.items()),
        flush=True,
    )

    if args.dry_run:
        print("dry run complete; Supabase was not changed", flush=True)
        return 0

    load_env_file(args.env_file.resolve())
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not service_key:
        raise SystemExit(
            "NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and "
            "SUPABASE_SERVICE_ROLE_KEY are required"
        )
    client = SupabaseREST(url, service_key)

    for source_table, destination_table, conflict_columns in TABLES:
        uploaded = 0
        for batch in chunks(rows_as_dicts(connection, source_table), args.batch_size):
            client.upsert(destination_table, conflict_columns, batch)
            uploaded += len(batch)
            if uploaded % (args.batch_size * 20) == 0 or uploaded == counts[source_table]:
                print(f"{destination_table}: {uploaded:,}/{counts[source_table]:,}", flush=True)

    import_run = {
        "generated_at": report["generatedAt"],
        "database_sha256": report["databaseSHA256"],
        "product_count": report["products"],
        "report": report,
    }
    client.upsert("food_catalog_import_runs", "generated_at", [import_run])
    print("food catalog upload complete", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, sqlite3.Error, ValueError, RuntimeError) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
