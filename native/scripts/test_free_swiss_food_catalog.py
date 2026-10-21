import csv
import tempfile
import unittest
from collections import Counter
from pathlib import Path

from scripts.build_free_swiss_food_catalog import (
    OFF_COLUMNS,
    barcode,
    clean_text,
    number,
    nutrition_from_off,
    open_food_facts_rows,
    retailer_evidence,
    sanitize_nutrition,
    verified_off_count,
)


class FreeSwissFoodCatalogTests(unittest.TestCase):
    def test_number_rejects_missing_negative_and_non_finite_values(self):
        self.assertEqual(number("12,5"), 12.5)
        self.assertIsNone(number(""))
        self.assertIsNone(number("-1"))
        self.assertIsNone(number("nan"))

    def test_barcode_validation(self):
        self.assertEqual(barcode("7612345678901"), "7612345678901")
        self.assertIsNone(barcode("12"))
        self.assertIsNone(barcode("7612-A"))

    def test_clean_text_collapses_source_whitespace(self):
        self.assertEqual(clean_text("  Swiss\n  yoghurt\t"), "Swiss yoghurt")

    def test_nutrition_outliers_are_cleared_and_reported(self):
        counts = Counter()
        result = sanitize_nutrition(
            {
                "calories": 901,
                "protein": 101,
                "carbs": 40,
                "fat": 20,
                "fiber": 2,
                "sugar": 10,
                "sodium": 50_001,
            },
            counts,
        )
        self.assertIsNone(result["calories"])
        self.assertIsNone(result["protein"])
        self.assertIsNone(result["sodium"])
        self.assertEqual(result["carbs"], 40)
        self.assertEqual(counts["clearedOutlierFields"], 3)

    def test_invalid_calories_fall_back_to_valid_kilojoules(self):
        row = {column: "" for column in OFF_COLUMNS}
        row.update({"energy-kcal_100g": "1600", "energy-kj_100g": "1600"})
        counts = Counter()
        result = nutrition_from_off(row, counts)
        self.assertAlmostEqual(result["calories"], 382.409, places=3)
        self.assertEqual(counts["clearedOutlierCalories"], 1)
        self.assertEqual(counts["recoveredCaloriesFromKilojoules"], 1)

    def test_suspiciously_empty_source_snapshot_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "unexpectedly fell to 0"):
            verified_off_count(
                {"ok": True, "truncated": False, "rows": [{"total": 0}]}
            )
        self.assertEqual(
            verified_off_count(
                {"ok": True, "truncated": False, "rows": [{"total": 10}]},
                minimum=10,
            ),
            10,
        )

    def test_retailer_matching_does_not_treat_biocoop_as_coop(self):
        self.assertEqual(retailer_evidence("Biocoop", "Example"), {})
        self.assertEqual(retailer_evidence("Coop Pronto", "Example"), {"coop": "store"})
        self.assertEqual(retailer_evidence("", "Prix Garantie"), {"coop": "brand"})

    def test_off_export_is_rejected_when_independent_count_does_not_match(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "off.csv"
            row = {column: "" for column in OFF_COLUMNS}
            row.update(code="7612345678901", product_name="Test food", proteins_100g="10")
            with path.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(handle, fieldnames=OFF_COLUMNS)
                writer.writeheader()
                writer.writerow(row)

            counts = Counter()
            products = list(open_food_facts_rows(path, 1, "2026-10-19T00:00:00Z", counts))
            self.assertEqual(len(products), 1)
            self.assertEqual(counts["sourceRows"], 1)
            with self.assertRaisesRegex(ValueError, "Incomplete Open Food Facts export"):
                list(open_food_facts_rows(path, 2, "2026-10-19T00:00:00Z"))


if __name__ == "__main__":
    unittest.main()
