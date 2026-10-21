import copy, unittest
from clean_food_catalog import clean

def item(code='1', **changes):
    p=dict(id=code,name='Bio Müesli',brand='Coop',unit='g',retailers=['coop'],nutrients=dict(calories=370,protein=10,carbs=60,fat=8),sourceUpdatedAt='2026-01-01T00:00:00Z')
    p.update(changes); return p

class CleanupTests(unittest.TestCase):
    def test_duplicates_merge_aliases_and_retailer_evidence(self):
        a=item('1', retailerEvidence={'coop':'brand'}); b=item('2',name='bio muesli',retailers=['coop','denner'], retailerEvidence={'coop':'store','denner':'store'}, barcodeAliases=['3'])
        result,audit=clean([a,b])
        self.assertEqual(len(result),1); self.assertEqual(result[0]['barcodeAliases'],['1','3'])
        self.assertEqual(result[0]['retailerEvidence']['coop'],'store'); self.assertEqual(audit['mergedDuplicateRecords'],1)
        self.assertEqual(result[0]['retailers'],['coop','denner'])
    def test_distinct_profiles_flavours_brands_and_units_survive(self):
        rows=[item(),item('2',name='Bio Müesli Schoko'),item('3',brand='Migros'),item('4',unit='ml'),item('5',nutrients=dict(calories=375,protein=10,carbs=60,fat=8))]
        self.assertEqual(len(clean(rows)[0]),5)
    def test_missing_is_removed_zero_and_partial_kept(self):
        rows=[item(nutrients={}),item('2',nutrients={'calories':0,'protein':0,'carbs':0,'fat':0}),item('3',nutrients={'calories':100}),item('4',nutrients={'fat':float('nan')})]
        result,audit=clean(rows)
        self.assertEqual([p['id'] for p in result],['2','3']); self.assertEqual(audit['removedWithoutNutrition'],2)
    def test_idempotent_and_does_not_mutate_source(self):
        rows=[item(),item('2')]; original=copy.deepcopy(rows)
        first=clean(rows)[0]; self.assertEqual(first,clean(first)[0]); self.assertEqual(rows,original)
    def test_absent_brand_not_merged_across_stores(self):
        self.assertEqual(len(clean([item(brand=''),item('2',brand='',retailers=['migros'])])[0]),2)
    def test_brand_order_and_float_noise(self):
        a=item(brand='Coop, Naturaplan'); b=item('2',brand='Naturaplan,Coop',nutrients=dict(calories=370,protein=10.000000001,carbs=60,fat=8))
        self.assertEqual(len(clean([a,b])[0]),1)
    def test_revised_alias_has_its_own_record(self):
        old=item('1',barcodeAliases=['2'])
        revised=item('2',nutrients=dict(calories=400,protein=10,carbs=60,fat=8))
        result,_=clean([old,revised])
        self.assertEqual(len(result),2)
        self.assertNotIn('2',result[0].get('barcodeAliases',[]))
