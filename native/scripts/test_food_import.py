import unittest
from import_food_catalog import normalize

class FoodImportTests(unittest.TestCase):
    def row(self, **extra):
        result = dict(code='7610123456789', product_name='Milch', stores_tags=['Coop', 'MIGROS'],
                      countries_tags=['en:switzerland'], nutrition_data_per='100ml',
                      nutriments={'energy-kj_100g':418.4,'proteins_100g':0,'fat_100g':'bad'})
        result.update(extra); return result

    def test_requires_country_and_actual_retailer(self):
        self.assertIsNone(normalize(self.row(stores_tags=['aldi']), 'coop', '2026-10-06T00:00:00Z'))
        self.assertIsNone(normalize(self.row(countries_tags=['en:germany']), 'coop', '2026-10-06T00:00:00Z'))

    def test_case_insensitive_stores_and_ml_basis(self):
        value=normalize(self.row(), 'coop', '2026-10-06T00:00:00Z')
        self.assertEqual(value['retailers'], ['coop','migros'])
        self.assertEqual(value['unit'], 'ml')
        self.assertAlmostEqual(value['nutrients']['calories'], 100)
        self.assertEqual(value['nutrients']['protein'], 0)
        self.assertNotIn('fat',value['nutrients'])
        self.assertNotIn('carbs',value['nutrients'])

    def test_german_name_and_no_estimated_nutrients(self):
        value=normalize(self.row(product_name_de='Vollmilch',nutriments={},nutriments_estimated={'proteins_100g':3.5}), 'migros', '2026-10-06T00:00:00Z')
        self.assertEqual(value['name'],'Vollmilch')
        self.assertEqual(value['nutrients'],{})

    def test_keeps_secondary_nutrients_and_converts_salt_to_sodium_mg(self):
        value=normalize(self.row(nutriments={'fiber_100g':4.5,'sugars_100g':2.1,'salt_100g':1.25}), 'coop', '2026-10-06T00:00:00Z')
        self.assertEqual(value['nutrients']['fiber'],4.5)
        self.assertEqual(value['nutrients']['sugar'],2.1)
        self.assertEqual(value['nutrients']['sodium'],500)

    def test_rejects_unnamed_and_invalid_barcode(self):
        self.assertIsNone(normalize(self.row(code='../oops'), 'coop', '2026-10-06T00:00:00Z'))
        self.assertIsNone(normalize(self.row(product_name=' '), 'coop', '2026-10-06T00:00:00Z'))

if __name__=='__main__': unittest.main()
