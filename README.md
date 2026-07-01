# Mondial 2026 — Arbre circulaire (live)

Arbre à élimination directe de la Coupe du Monde 2026, disposé en cercle,
mis à jour automatiquement toutes les 5 minutes via GitHub Actions.

## Comment ça marche

```
football-data.org  --(toutes les 5 min, côté serveur)-->  scripts/fetch-data.js
                                                                   |
                                                                   v
                                                          data/bracket.json  (commité dans le repo)
                                                                   |
                                                                   v
                                                    index.html (GitHub Pages) le lit en same-origin
```

La clé API ne touche jamais le navigateur : elle vit uniquement dans les secrets
GitHub Actions. Le front-end ne fait qu'un `fetch('./data/bracket.json')` sur
son propre domaine, donc aucun souci de CORS ni de quota côté client.

## Mise en place (une seule fois, ~5 min)

1. **Crée le repo** `world-cup` sur ton compte GitHub et pousse ce dossier tel quel.

2. **Ajoute ta clé API en secret** :
   Settings → Secrets and variables → Actions → New repository secret
   - Nom : `FOOTBALL_DATA_API_KEY`
   - Valeur : ta clé football-data.org

3. **Active GitHub Pages** :
   Settings → Pages → Source : `Deploy from a branch` → Branch : `main` / `root`

4. **Lance le premier import manuellement** (pas besoin d'attendre 5 min) :
   Onglet Actions → "Update World Cup bracket data" → Run workflow

5. Va sur `https://TON-PSEUDO.github.io/world-cup/` — l'arbre se remplit et se
   met à jour tout seul toutes les 5 minutes, à chaque fois que tu reviens.

## Notes

- GitHub peut retarder légèrement les cron `schedule` en cas de forte charge sur
  la plateforme — ce n'est pas garanti à la seconde près, mais reste largement
  suffisant pour un score de foot.
- Si un repo est inactif pendant 60 jours, GitHub désactive automatiquement les
  workflows programmés ; un simple push ou un `Run workflow` manuel les
  réactive.
- Le script ignore volontairement les rounds qui ne sont pas une puissance de 2
  (matchs) et exclut la petite finale — seuls 32es → Finale sont affichés.
