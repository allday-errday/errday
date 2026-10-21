#!/usr/bin/env python3
"""Verified full Coop/Migros Switzerland export from OFF's public Mirabelle service.
No page cap; verify the streamed CSV against a separate source count before writing.
"""
import argparse, csv, datetime as dt, hashlib, json, re, subprocess
from collections import Counter
from pathlib import Path
from urllib.parse import urlencode
from import_food_catalog import normalize, ROOT
from clean_food_catalog import clean

COLUMNS = ['code','product_name','brands','stores','countries_tags','quantity','last_modified_t',
           'energy-kcal_100g','energy-kj_100g','energy_100g','proteins_100g','carbohydrates_100g','fat_100g',
           'fiber_100g','sugars_100g','sodium_100g','salt_100g']
SQL = ('select '+','.join('"'+x+'"' for x in COLUMNS)+' from [all] '
       "where countries_tags like '%en:switzerland%' and (lower(stores) like '%coop%' or lower(stores) like '%migros%' or lower(stores) like '%denner%' or lower(brands) like '%coop%' or lower(brands) like '%naturaplan%' or lower(brands) like '%prix garantie%' or lower(brands) like '%denner%')")
BASE = 'https://mirabelle.openfoodfacts.org/products'
RETAILERS = ['coop','migros','denner']

def retailer_evidence(row):
    stores={s.strip().casefold() for s in row['stores'].split(',')}
    brands={s.strip().casefold() for s in row['brands'].split(',')}
    evidence={r:'store' for r in RETAILERS if r in stores}
    if stores & {'coop pronto','coop.ch','coop@home'}: evidence['coop']='store'
    if 'coop' not in evidence and any(b in {'coop','naturaplan','prix garantie'} or b.startswith('coop ') for b in brands):
        evidence['coop']='brand'
    if 'denner' not in evidence and 'denner' in brands: evidence['denner']='brand'
    return evidence

def merge_evidence(first, second):
    result=dict(first or {})
    for retailer, reason in (second or {}).items():
        if result.get(retailer) != 'store': result[retailer]=reason
    return result

def adapt(row):
    # Match whole retailer names: Biocoop is not Coop.
    stores = list(retailer_evidence(row))
    product = dict(code=row['code'], product_name=row['product_name'], brands=row['brands'],
                   stores_tags=stores, countries_tags=row['countries_tags'].split(','),
                   last_modified_t=row['last_modified_t'],
                   nutriments={key:row[key] for key in COLUMNS if key.endswith('_100g')})
    # CSV omits the explicit basis. A liquid pack unit is a hint; editor asks for verification.
    if re.fullmatch(r'\s*\d+(?:[.,]\d+)?\s*(?:ml|cl|dl|l)\s*', row['quantity'], re.I):
        product['product_quantity_unit']='ml'
    return product

def assemble(rows, expected, previous, fetched):
    if len(rows) != expected: raise ValueError(f'Incomplete export: {len(rows)} rows; source reports {expected}')
    products={}; matched=Counter(); rejected=Counter()
    for row in rows:
        if set(row) != set(COLUMNS) or any(v is None for v in row.values()):
            raise ValueError('Malformed or truncated CSV; keeping previous catalogue')
        product=adapt(row)
        for retailer in RETAILERS:
            if retailer not in product['stores_tags'] or 'en:switzerland' not in product['countries_tags']: continue
            matched[retailer]+=1
            item=normalize(product,retailer,fetched)
            if item is None: rejected[retailer]+=1; continue
            item['retailerEvidence']=retailer_evidence(row)
            old=products.get(item['id'])
            if old:
                retailers=sorted(set(old['retailers']+item['retailers']))
                evidence=merge_evidence(old.get('retailerEvidence'),item.get('retailerEvidence'))
                if old.get('sourceUpdatedAt','') > item.get('sourceUpdatedAt',''): item=dict(old)
                item['retailers']=retailers
                item['retailerEvidence']=evidence
            products[item['id']]=item
    export_unique=len(products)
    previous_products={p['id']:p for p in previous.get('products',[])}
    supplements=0
    for code, old in previous_products.items():
        new=products.get(code)
        if new is None: products[code]=old; supplements+=1
        elif old.get('sourceUpdatedAt','') >= new.get('sourceUpdatedAt',''):
            # Keep richer names, explicit units and nutrients from the same/newer API revision.
            merged=dict(old); merged['retailers']=sorted(set(old['retailers']+new['retailers'])); merged['retailerEvidence']=merge_evidence(old.get('retailerEvidence'),new.get('retailerEvidence'))
            products[code]=merged
    if not products or not all(matched[r] for r in ['coop','migros']): raise ValueError('Empty retailer export')
    cleaned, cleanup = clean(list(products.values()))
    return dict(schemaVersion=1, generatedAt=fetched, source='Open Food Facts', license='ODbL 1.0',
                reports=[dict(retailer=r,sourceCount=matched[r],receivedCount=matched[r],allPagesFetched=True,
                              excludedUnusableCount=rejected[r]) for r in RETAILERS],
                importAudit=dict(cleanup=cleanup,method='Mirabelle full CSV export',candidateRows=expected,
                                 uniqueUsableExportProducts=export_unique,retainedPreviousProducts=supplements,
                                 excludedReasons='Missing name or invalid barcode; Swiss country tag plus exact retailer/recognised Coop or Denner brand required'),
                products=cleaned)

def download(url, path):
    temp=path.with_suffix('.download')
    subprocess.run(['curl','--fail','--location','--silent','--show-error','--max-time','180',url,'-o',str(temp)],check=True)
    temp.replace(path)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--cache',type=Path,required=True)
    parser.add_argument('--reuse-verified-downloads',action='store_true',help='Reuse CSV and independent count in the given cache')
    args=parser.parse_args(); args.cache.mkdir(parents=True,exist_ok=True)
    csv_path=args.cache/'products.csv'; count_path=args.cache/'count.json'
    csv_url=BASE+'.csv?'+urlencode(dict(sql=SQL,_size='max',_stream='on'))
    count_url=BASE+'.json?'+urlencode(dict(sql='select count(*) as total from ('+SQL+')',_shape='objects'))
    if not args.reuse_verified_downloads:
        print('Downloading full export …',flush=True); download(csv_url,csv_path)
        print('Verifying source count …',flush=True); download(count_url,count_path)
    count=json.loads(count_path.read_text())
    if not count.get('ok') or count.get('truncated') or count.get('query',{}).get('sql') != 'select count(*) as total from ('+SQL+')':
        raise ValueError('Unverified source count')
    with csv_path.open(newline='') as f:
        reader=csv.DictReader(f)
        if reader.fieldnames != COLUMNS: raise ValueError('Unexpected CSV schema')
        rows=list(reader)
    dest=ROOT/'App/Resources/food-catalog.json'
    previous=json.loads(dest.read_text()) if dest.exists() else {}
    fetched=dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    result=assemble(rows,int(count['rows'][0]['total']),previous,fetched)
    result['importAudit'].update(sourceURL=csv_url,csvSHA256=hashlib.sha256(csv_path.read_bytes()).hexdigest())
    temp=dest.with_suffix('.tmp'); temp.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n'); temp.replace(dest)
    print(json.dumps(dict(products=len(result['products']),reports=result['reports'],audit=result['importAudit']),ensure_ascii=False))

if __name__=='__main__': main()
