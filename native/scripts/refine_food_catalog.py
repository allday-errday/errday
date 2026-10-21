#!/usr/bin/env python3
"""Atomically apply quality rules to an existing verified catalog snapshot."""

from __future__ import annotations

import argparse
import json
import shutil
import sqlite3
from collections import Counter
from pathlib import Path

from build_free_swiss_food_catalog import (
    clean_text,
    sanitize_nutrition,
    sha256,
    utc_now,
)


NUTRIENTS = ("calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium")
TEXT_FIELDS = ("name", "brand", "category")


def refine(database: Path, report_path: Path) -> dict:
    report = json.loads(report_path.read_text(encoding="utf-8"))
    expected_products = int(report["products"])
    temporary = database.with_suffix(database.suffix + ".quality.tmp")
    temporary.unlink(missing_ok=True)
    shutil.copy2(database, temporary)
    connection = sqlite3.connect(temporary)
    counts = Counter()
    try:
        columns = ("id", *TEXT_FIELDS, *NUTRIENTS)
        rows = connection.execute(
            f"select {','.join(columns)} from products"
        ).fetchall()
        if len(rows) != expected_products:
            raise ValueError(
                f"catalog contains {len(rows):,} products; expected {expected_products:,}"
            )

        for values in rows:
            row = dict(zip(columns, values))
            texts = {
                field: None if field == "category" and row[field] is None else clean_text(row[field])
                for field in TEXT_FIELDS
            }
            nutrients = sanitize_nutrition(
                {field: row[field] for field in NUTRIENTS}, counts
            )
            for field in TEXT_FIELDS:
                if texts[field] != row[field]:
                    counts["normalizedTextFields"] += 1
            updated = (*texts.values(), *nutrients.values(), row["id"])
            connection.execute(
                """
                update products
                set name = ?, brand = ?, category = ?, calories = ?, protein = ?,
                    carbs = ?, fat = ?, fiber = ?, sugar = ?, sodium = ?
                where id = ?
                """,
                updated,
            )

        connection.execute("delete from product_search")
        connection.execute(
            """
            insert into product_search (product_id, name, brand, aliases)
            select p.id, p.name, p.brand, coalesce(group_concat(n.name, ' '), '')
            from products p
            left join product_names n on n.product_id = p.id
            group by p.id
            """
        )

        product_count = connection.execute("select count(*) from products").fetchone()[0]
        search_count = connection.execute("select count(*) from product_search").fetchone()[0]
        if product_count != expected_products or search_count != expected_products:
            raise ValueError("quality refinement changed catalog coverage")

        complete = connection.execute(
            """
            select count(*) from products
            where calories is not null and protein is not null
              and carbs is not null and fat is not null
            """
        ).fetchone()[0]
        report.update(
            generatedAt=utc_now(),
            status="bundled with the native app and mirrored to Supabase",
            completeMacros=complete,
            partialMacros=product_count - complete,
            qualityAdjustments=dict(counts),
        )
        connection.execute("delete from import_runs")
        connection.execute(
            "insert into import_runs values (?, ?)",
            (report["generatedAt"], json.dumps(report, sort_keys=True)),
        )
        connection.commit()
        integrity = connection.execute("pragma integrity_check").fetchone()[0]
        if integrity != "ok":
            raise ValueError(f"SQLite integrity check failed: {integrity}")
        connection.execute("vacuum")
    except Exception:
        connection.close()
        temporary.unlink(missing_ok=True)
        raise
    connection.close()
    temporary.replace(database)

    report["databaseBytes"] = database.stat().st_size
    report["databaseSHA256"] = sha256(database)
    report_temporary = report_path.with_suffix(report_path.suffix + ".tmp")
    report_temporary.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    report_temporary.replace(report_path)
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(refine(args.database, args.report), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
