# Mondial 2026 — Arbre circulaire (live)

Arbre à élimination directe de la Coupe du Monde 2026, disposé en cercle.

Le front reste 100 % statique sur **GitHub Pages**, mais la source de données
peut maintenant être déplacée vers un **Cloudflare Worker** gratuit, plus fiable
qu'un cron GitHub Actions pour du 5 minutes.

## Architecture recommandée

```
football-data.org  --(toutes les 5 min, Cloudflare Cron)-->  cloudflare/worker.mjs
                                                                      |
                                                                      v
                                                             Cloudflare KV
                                                                      |
                                                                      v
                                         /bracket.json sur workers.dev (CORS autorisé)
                                                                      |
                                                                      v
                                   index.html (GitHub Pages) le lit via /config.js
```

Le repo contient désormais :

- `/home/runner/work/world-cup/world-cup/cloudflare/worker.mjs` — le Worker qui
  fetch l'API, garde le dernier JSON en KV et expose `/bracket.json`
- `/home/runner/work/world-cup/world-cup/cloudflare/wrangler.example.jsonc` —
  un exemple de configuration Wrangler
- `/home/runner/work/world-cup/world-cup/config.js` — la config front pour
  choisir la source de données

## Migration Cloudflare (gratuite)

1. **Crée un Worker Cloudflare**
   - Dashboard → Workers & Pages → Create → Create Worker
   - Donne-lui un nom du style `world-cup-data`

2. **Crée un namespace KV**
   - Dashboard → Storage & Databases → KV
   - Crée par exemple `WORLD_CUP_DATA`

3. **Ajoute les bindings et secrets au Worker**
   - Binding KV :
     - Nom : `BRACKET_KV`
     - Namespace : ton `WORLD_CUP_DATA`
   - Secret :
     - Nom : `FOOTBALL_DATA_API_KEY`
     - Valeur : ta clé football-data.org

4. **Ajoute les variables recommandées**
   - `ALLOWED_ORIGIN=https://TON-PSEUDO.github.io`
   - `BRACKET_KV_KEY=bracket.json`
   - Laisse `COMPETITION=WC` et `API_BASE=https://api.football-data.org/v4`
     si tu utilises le fichier d'exemple

5. **Configure le cron**
   - Trigger cron : `*/5 * * * *`

6. **Déploie le code du Worker**
   - Soit en copiant le contenu de `cloudflare/worker.mjs` dans l'éditeur du
     dashboard
   - Soit avec Wrangler en partant de `cloudflare/wrangler.example.jsonc`

7. **Pointe le front vers le Worker**
   - Édite `/home/runner/work/world-cup/world-cup/config.js`
   - Remplace `dataUrl` par ton endpoint public, par exemple :

   ```js
   dataUrl: "https://world-cup-data.<ton-compte>.workers.dev/bracket.json"
   ```

8. **Active GitHub Pages**
   - Settings → Pages → Source : `Deploy from a branch` → Branch : `main` / `root`

9. **Teste**
   - Ouvre `https://TON-PSEUDO.github.io/world-cup/`
   - Le Worker peut remplir KV au premier appel HTTP si le cache est vide
   - Le endpoint `https://...workers.dev/healthz` permet de vérifier rapidement
     si une version du JSON est déjà stockée

## Fallback GitHub Actions

Le workflow `/home/runner/work/world-cup/world-cup/.github/workflows/update-data.yml`
est conservé pour l'instant comme solution de secours. Tant que `config.js`
pointe encore vers `./data/bracket.json`, le site continue à fonctionner comme
avant.

## Notes

- Le Worker renvoie la même structure JSON que l'ancien fichier
  `data/bracket.json`, donc le front n'a pas besoin de changer de format.
- Le service worker du front laisse maintenant les requêtes cross-origin
  (notamment vers `workers.dev`) passer directement au réseau pour éviter de
  geler une vieille réponse dans le cache local.
- Le script ignore volontairement les rounds qui ne sont pas une puissance de 2
  (matchs) et exclut la petite finale — seuls 32es → Finale sont affichés.
