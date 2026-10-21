#!/usr/bin/env python3
"""Import the Switzerland + Coop/Migros subset of Open Food Facts (ODbL).
Resumable page cache, one request per >=7 seconds, atomic output. No shop scraping.
"""
import argparse, datetime as dt, json, math, subprocess, time
from clean_food_catalog import clean
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
FIELDS = 'code,product_name,product_name_de,brands,stores_tags,countries_tags,nutriments,product_quantity_unit,last_modified_t'

def normalize(product, retailer, fetched):
    code = str(product.get('code', ''))
    name = (product.get('product_name_de') or product.get('product_name') or '').strip()
    stores = [str(s).casefold() for s in product.get('stores_tags', [])]
    if not code.isascii() or not code.isdigit() or not name or retailer not in stores or 'en:switzerland' not in product.get('countries_tags', []):
        return None
    nutrients = product.get('nutriments') or {}
    def number(key):
        try:
            value = float(nutrients[key])
            return value if math.isfinite(value) and value >= 0 else None
        except (KeyError, ValueError, TypeError): return None
    kcal = number('energy-kcal_100g')
    if kcal is None:
        kj = number('energy-kj_100g')
        if kj is None: kj = number('energy_100g')
        if kj is not None: kcal = kj / 4.184
    sodium = number('sodium_100g')
    # Open Food Facts standardises sodium in grams; Errday stores it in mg.
    # Swiss/EU labels often only report salt, which converts to sodium at 40%.
    if sodium is not None: sodium *= 1_000
    elif (salt := number('salt_100g')) is not None: sodium = salt * 400
    values = dict(calories=kcal, protein=number('proteins_100g'), carbs=number('carbohydrates_100g'),
                  fat=number('fat_100g'), fiber=number('fiber_100g'), sugar=number('sugars_100g'), sodium=sodium)
    result = dict(id=code, name=name, brand=product.get('brands') or '', nutrients={k:v for k,v in values.items() if v is not None},
                  unit='ml' if product.get('nutrition_data_per') == '100ml' or product.get('product_quantity_unit') == 'ml' else 'g',
                  retailers=[r for r in ['coop', 'migros', 'denner'] if r in stores], fetchedAt=fetched)
    try: result['sourceUpdatedAt'] = dt.datetime.fromtimestamp(float(product['last_modified_t']), dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    except (KeyError, ValueError, TypeError, OverflowError): pass
    return result

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--max-pages',type=int,default=1000)
    parser.add_argument('--allow-smaller-catalog',action='store_true')
    parser.add_argument('--cache',type=Path,default=Path('/tmp/errday-off-catalog-cache'))
    args=parser.parse_args(); args.cache.mkdir(parents=True,exist_ok=True)
    products={}; reports=[]; last_request=0
    fetched=dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    for retailer in ['coop','migros']:
        page=1; received=0; total=None
        while page<=args.max_pages:
            cached=args.cache/f'{retailer}-{page}.json'
            url='https://world.openfoodfacts.org/api/v2/search?'+urlencode(dict(countries_tags='en:switzerland',stores_tags=retailer,page_size=100,page=page,fields=FIELDS,sort_by='code'))
            if cached.exists(): data=json.loads(cached.read_text())
            else:
                for attempt in range(4):
                    time.sleep(max(0,7-(time.monotonic()-last_request)))
                    last_request=time.monotonic()
                    response=subprocess.run(['curl','--fail','--silent','--show-error','--max-time','60','-A','Errday/0.1 (personal iOS app; https://www.errday.ch)',url],capture_output=True)
                    try:
                        if response.returncode: raise ValueError('HTTP request failed')
                        data=json.loads(response.stdout)
                        if not isinstance(data.get('products'),list) or 'count' not in data: raise ValueError('Invalid response')
                        cached.write_text(json.dumps(data)); break
                    except (ValueError,TypeError):
                        if attempt==3: raise RuntimeError(f'Import stopped at {retailer} page {page}; previous catalogue is unchanged.')
                        time.sleep(15*(attempt+1))
            if int(data.get('page', 0)) != page:
                raise RuntimeError(f'Unexpected page for {retailer}; refusing an incomplete replacement.')
            total=int(data['count']); rows=data['products']; received+=len(rows)
            for row in rows:
                item=normalize(row,retailer,fetched)
                if item:
                    if item['id'] in products: item['retailers']=sorted(set(item['retailers']+products[item['id']]['retailers']))
                    products[item['id']]=item
            print(f'{retailer}: page {page}, {received}/{total} source records, {len(products)} unique usable names',flush=True)
            if page*int(data.get('page_size',100))>=total or not rows: break
            page+=1
        reports.append(dict(retailer=retailer,sourceCount=total,receivedCount=received,allPagesFetched=received>=total))
    result=dict(schemaVersion=1,generatedAt=fetched,source='Open Food Facts',license='ODbL 1.0',reports=reports,products=sorted(products.values(),key=lambda x:x['id']))
    result['products'], cleanup = clean(result['products'])
    result['importAudit'] = {'cleanup': cleanup}
    dest=ROOT/'App/Resources/food-catalog.json'; temp=dest.with_suffix('.tmp')
    if dest.exists() and not args.allow_smaller_catalog:
        previous=json.loads(dest.read_text())
        if len(result['products']) < len(previous.get('products', [])):
            raise RuntimeError('Refusing to replace a larger catalogue with a partial API import. Use import_food_export.py.')
    temp.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n'); temp.replace(dest)
    print(json.dumps({'output':str(dest),'products':len(products),'reports':reports}),flush=True)

if __name__=='__main__': main()
