import unittest
from import_food_export import assemble, COLUMNS

NOW='2026-10-06T00:00:00Z'
def row(**updates):
    data={key:'' for key in COLUMNS}
    data.update(code='7610000000001',product_name='Milch',stores='Coop, Migros',countries_tags='en:switzerland',
                quantity='1 l',last_modified_t='1700000000',**{'energy-kcal_100g':'60','proteins_100g':'3','carbohydrates_100g':'5','fat_100g':'3'})
    data.update(updates); return data

class FullExportTests(unittest.TestCase):
    def test_rejects_truncated_export_and_malformed_rows(self):
        with self.assertRaises(ValueError): assemble([row()],2,{},NOW)
        broken=row(); broken['stores']=None
        with self.assertRaises(ValueError): assemble([broken],1,{},NOW)

    def test_filters_biocoop_and_foreign_products(self):
        rows=[row(),row(code='2',stores='Biocoop'),row(code='3',countries_tags='en:france')]
        result=assemble(rows,3,{},NOW)
        self.assertEqual(len(result['products']),1)
        self.assertEqual(result['reports'][0]['sourceCount'],1)
        self.assertTrue(all(r['allPagesFetched'] for r in result['reports']))

    def test_missing_names_are_accounted_and_missing_nutrients_stay_missing(self):
        rows=[row(),row(code='2',product_name=''),row(code='3',**{'fat_100g':''})]
        result=assemble(rows,3,{},NOW)
        self.assertEqual(result['reports'][0]['excludedUnusableCount'],1)
        self.assertNotIn('fat',next(p for p in result['products'] if p['id']=='3')['nutrients'])

    def test_preserves_secondary_nutrients_and_converts_sodium_to_mg(self):
        result=assemble([row(**{'fiber_100g':'3','sugars_100g':'4.5','sodium_100g':'0.12'})],1,{},NOW)
        nutrients=result['products'][0]['nutrients']
        self.assertEqual(nutrients['fiber'],3)
        self.assertEqual(nutrients['sugar'],4.5)
        self.assertEqual(nutrients['sodium'],120)

    def test_duplicate_barcodes_keep_latest_values_and_merge_retailers(self):
        rows=[row(stores='Coop'),row(stores='Migros',last_modified_t='1700000100',**{'energy-kcal_100g':'70'})]
        result=assemble(rows,2,{},NOW)
        self.assertEqual(len(result['products']),1)
        self.assertEqual(result['products'][0]['retailers'],['coop','migros'])
        self.assertEqual(result['products'][0]['nutrients']['calories'],70)

    def test_previous_richer_revision_is_preserved_without_regressing_newer_data(self):
        previous=assemble([row()],1,{},NOW)
        previous['products'][0]['name']='Vollmilch Deutsch'
        same=assemble([row()],1,previous,NOW)
        self.assertEqual(same['products'][0]['name'],'Vollmilch Deutsch')
        newer=assemble([row(last_modified_t='1800000000')],1,previous,NOW)
        self.assertEqual(newer['products'][0]['name'],'Milch')
        self.assertEqual(newer['products'][0]['unit'],'ml')

if __name__=='__main__': unittest.main()

class RetailerEvidenceTests(unittest.TestCase):
    def test_coop_brand_without_store_is_labelled_inferred(self):
        from import_food_export import retailer_evidence
        self.assertEqual(retailer_evidence(row(stores='',brands='Coop Naturaplan')),{'coop':'brand'})
        self.assertEqual(retailer_evidence(row(stores='',brands='Naturaplan')),{'coop':'brand'})
        self.assertEqual(retailer_evidence(row(stores='',brands='Prix Garantie')),{'coop':'brand'})
        self.assertEqual(retailer_evidence(row(stores='Biocoop',brands='Cooperativa')), {})

    def test_direct_store_wins_and_denner_is_separate(self):
        from import_food_export import retailer_evidence
        self.assertEqual(retailer_evidence(row(stores='Denner',brands='Denner')),{'denner':'store'})
        self.assertEqual(retailer_evidence(row(stores='',brands='Denner')),{'denner':'brand'})
        self.assertEqual(retailer_evidence(row(stores='Coop',brands='Naturaplan')),{'coop':'store'})

    def test_import_preserves_denner_and_evidence(self):
        rows=[row(),row(code='12345678',stores='Denner',brands='Denner')]
        result=assemble(rows,2,{},NOW)
        item=next(p for p in result['products'] if p['id']=='12345678')
        self.assertEqual(item['retailers'],['denner'])
        self.assertEqual(item['retailerEvidence'],{'denner':'store'})

class EvidenceMergeTests(unittest.TestCase):
    def test_direct_evidence_survives_merging_and_other_retailers_are_kept(self):
        from import_food_export import merge_evidence
        self.assertEqual(merge_evidence({'coop':'store'}, {'coop':'brand','denner':'store'}), {'coop':'store','denner':'store'})
        self.assertEqual(merge_evidence({'coop':'brand'}, {'coop':'store'}), {'coop':'store'})
