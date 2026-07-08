// Common food vocabulary across English / German / French so an English
// (or French) search still finds Swiss products stored under German names.
// Each row is a group of equivalent terms; searching any one also searches
// the others. Not a full translation — it covers the everyday food words
// people actually type ("oats", "chicken", "chocolate", ...).
const groups: string[][] = [
  ["oats", "oat", "rolled oats", "oatmeal", "haferflocken", "hafer", "avoine"],
  ["chicken", "chicken breast", "poulet", "haehnchen", "hähnchen", "huhn", "pouletbrust"],
  ["milk", "milch", "lait"],
  ["chocolate", "schokolade", "schoggi", "chocolat"],
  ["bread", "brot", "pain"],
  ["toast", "toastbrot"],
  ["cheese", "kaese", "käse", "fromage"],
  ["egg", "eggs", "ei", "eier", "oeuf", "oeufs"],
  ["rice", "reis", "riz"],
  ["yogurt", "yoghurt", "joghurt", "jogurt", "yaourt"],
  ["water", "wasser", "eau"],
  ["juice", "saft", "jus"],
  ["apple", "apples", "apfel", "aepfel", "äpfel", "pomme"],
  ["banana", "bananas", "banane", "bananen"],
  ["butter", "beurre"],
  ["margarine"],
  ["pasta", "noodles", "teigwaren", "nudeln", "pates", "pâtes", "spaghetti"],
  ["tuna", "thunfisch", "thon"],
  ["salmon", "lachs", "saumon"],
  ["beef", "rindfleisch", "boeuf", "rind"],
  ["pork", "schweinefleisch", "porc", "schwein"],
  ["potato", "potatoes", "kartoffeln", "kartoffel", "pomme de terre", "roesti", "rösti"],
  ["tomato", "tomatoes", "tomaten", "tomate"],
  ["cookies", "cookie", "biscuits", "guetzli", "kekse", "biscuit"],
  ["chips", "crisps"],
  ["nuts", "nuesse", "nüsse", "noix"],
  ["almond", "almonds", "mandeln", "mandel", "amande"],
  ["peanut", "peanuts", "erdnuss", "erdnuesse", "erdnüsse", "cacahuete", "cacahuète"],
  ["honey", "honig", "miel"],
  ["sugar", "zucker", "sucre"],
  ["salt", "salz", "sel"],
  ["coffee", "kaffee", "cafe", "café"],
  ["tea", "tee", "the", "thé"],
  ["beer", "bier", "biere", "bière"],
  ["wine", "wein", "vin"],
  ["flour", "mehl", "farine"],
  ["oil", "olive oil", "oel", "öl", "olivenoel", "olivenöl", "huile"],
  ["muesli", "muesli", "müesli", "müsli", "granola"],
  ["cereal", "cereals", "cerealien", "cornflakes", "frühstücksflocken"],
  ["ham", "schinken", "jambon"],
  ["sausage", "wurst", "saucisse", "cervelat", "bratwurst"],
  ["carrot", "carrots", "karotten", "ruebli", "rüebli", "carotte"],
  ["cucumber", "gurke", "concombre"],
  ["strawberry", "strawberries", "erdbeeren", "erdbeere", "fraise"],
  ["orange", "oranges", "orangen"],
  ["lemon", "zitrone", "citron"],
  ["protein bar", "proteinriegel", "protein riegel"],
  ["protein", "eiweiss", "eiweiß", "proteine", "protéine"],
  ["ice cream", "glace", "glacé", "speiseeis", "eis"],
  ["soup", "suppe", "soupe"],
  ["quark", "magerquark"],
  ["cream", "rahm", "sahne", "creme", "crème"],
  ["beans", "bohnen", "haricots"],
  ["corn", "mais", "maïs"],
  ["fish", "fisch", "poisson"],
  ["meat", "fleisch", "viande"],
  ["vegetables", "gemuese", "gemüse", "legumes", "légumes"],
  ["fruit", "obst", "fruechte", "früchte", "fruits"],
  ["chickpeas", "kichererbsen", "pois chiches"],
  ["lentils", "linsen", "lentilles"],
  ["spinach", "spinat", "epinards", "épinards"],
];

const index = new Map<string, string[]>();
for (const group of groups) {
  for (const term of group) {
    index.set(term, group);
  }
}

/**
 * Returns alternate query strings in other languages for a food search.
 * Excludes the original query; capped so we only fire a couple of extra
 * lookups. Handles both whole-query matches ("oats") and single-word
 * substitutions inside a phrase ("greek yogurt" -> "greek joghurt").
 */
export function expandQuery(raw: string): string[] {
  const q = raw.trim().toLowerCase();
  if (!q) return [];

  const variants = new Set<string>();

  const whole = index.get(q);
  if (whole) {
    for (const term of whole) {
      if (term !== q) variants.add(term);
    }
  }

  const words = q.split(/\s+/);
  if (words.length > 1) {
    words.forEach((word, i) => {
      const group = index.get(word);
      if (!group) return;
      for (const term of group) {
        if (term === word) continue;
        const copy = [...words];
        copy[i] = term;
        variants.add(copy.join(" "));
      }
    });
  }

  return Array.from(variants).slice(0, 6);
}
