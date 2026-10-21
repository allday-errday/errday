"""Conservative, repeatable catalogue cleanup; barcode aliases remain searchable."""
import copy, math, re, unicodedata

# Keep every tracked nutrient. These also form part of a product's nutritional
# identity, so two variants that differ only in sugar or sodium are not merged.
FIELDS = ('calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium')

def text_key(value):
    return re.sub(r'[^\w]+', ' ', unicodedata.normalize('NFKD', value.casefold()).encode('ascii', 'ignore').decode()).strip()

def identity(product):
    # Never fuzzy-match flavours, brands, different nutrient profiles or g/ml.
    brand = tuple(sorted(text_key(b) for b in product['brand'].split(',') if text_key(b)))
    return (text_key(product['name']), brand, product['unit'],
            tuple(round(product['nutrients'][f], 3) if f in product['nutrients'] else None for f in FIELDS),
            tuple(sorted(product['retailers'])) if not brand else ())

def clean(products):
    groups = {}; removed = 0; merged = 0
    # Newest source revision wins deterministically, with stable barcode tie-break.
    for source in sorted(products, key=lambda p: (p.get('sourceUpdatedAt', ''), p['id']), reverse=True):
        p = copy.deepcopy(source)
        p['nutrients'] = {k:v for k,v in p['nutrients'].items() if k in FIELDS and isinstance(v, (int,float)) and math.isfinite(v) and v >= 0}
        if not p['nutrients']:
            removed += 1
            continue
        key = identity(p)
        if key not in groups:
            groups[key] = p
            continue
        winner = groups[key]; merged += 1
        aliases = set(winner.get('barcodeAliases', [])) | set(p.get('barcodeAliases', [])) | {p['id']}
        winner['barcodeAliases'] = sorted(aliases - {winner['id']})
        winner['retailers'] = sorted(set(winner['retailers'] + p['retailers']))
        evidence = winner.setdefault('retailerEvidence', {})
        for retailer, reason in p.get('retailerEvidence', {}).items():
            if evidence.get(retailer) != 'store': evidence[retailer] = reason
    # A later import may split a former alias because its recipe changed.
    canonical = {p['id'] for p in groups.values()}
    owned = set(canonical)
    for p in groups.values():
        if 'barcodeAliases' in p:
            p['barcodeAliases'] = [code for code in p['barcodeAliases'] if code not in owned]
            owned.update(p['barcodeAliases'])
    return sorted(groups.values(), key=lambda p:p['id']), dict(removedWithoutNutrition=removed, mergedDuplicateRecords=merged, remainingProducts=len(groups), rule='Same normalized name, brand, unit and nutrient profile (precision 0.001); barcode aliases retained')

if __name__ == '__main__':
    import json
    from pathlib import Path
    path = Path(__file__).resolve().parents[1] / 'App/Resources/food-catalog.json'
    catalog = json.loads(path.read_text())
    catalog['products'], report = clean(catalog['products'])
    catalog.setdefault('importAudit', {})['cleanup'] = report
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':'))+'\n')
    temporary.replace(path)
    print(json.dumps(report))
