import csv
import tempfile
import unittest
from collections import Counter
from pathlib import Path

from scripts.build_free_swiss_food_catalog import (
    OFF_COLUMNS,
    barcode,
    number,
    open_food_facts_rows,
    retailer_evidence,
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
