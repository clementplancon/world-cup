# Mondial 2026 — Arbre circulaire (live)

Arbre à élimination directe de la Coupe du Monde 2026, disposé en cercle,
avec un affichage qui relit le flux live toutes les 2 minutes.

## Comment ça marche

```
football-data.org  --(côté serveur)-->  scripts/fetch-data.js
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
   relit tout seul le flux live toutes les 2 minutes, à chaque fois que tu reviens.

## Serveur persistant (`server.js`) — Phase 0

Le front-end en production ne lit plus `data/bracket.json` depuis GitHub Pages,
mais depuis un **serveur Node persistant** hébergé sur
`https://world-cup-data.pointvirgule.dev` (voir `DATA_URL` dans `index.html`).
Ce serveur remplace le script one-shot : il interroge football-data.org toutes
les 2 minutes, garde le dernier tableau en mémoire et l'expose en HTTP.

```
football-data.org --(toutes les 2 min)--> server.js (lib/bracket.js)
                                                   |
                                     ┌─────────────┴─────────────┐
                                     v                           v
                          GET /bracket.json  { updated, rounds }   data/bracket.json (persisté)
                                     |
                                     v
                        index.html (fetch CORS sur le domaine du serveur)
```

- **`lib/bracket.js`** : toute la logique métier (topologie du tableau,
  `buildRounds`, `isInsideAMatchWindow`, `fetchAndBuildBracket`). Partagée entre
  le serveur et le CLI — une seule source de vérité.
- **`scripts/fetch-data.js`** : conservé comme CLI manuel one-shot
  (`FOOTBALL_DATA_API_KEY=... node scripts/fetch-data.js`).
- **`GET /bracket.json`** : renvoie exactement le schéma `{ updated, rounds }`,
  `Access-Control-Allow-Origin: *`, `Cache-Control: no-cache, must-revalidate`.
  Renvoie `{ updated: null, rounds: [] }` en 200 tant qu'aucune donnée n'existe.
- **`GET /health`** : `{ status: "ok", lastFetchAt }`.

## Temps réel (`GET /events`) — Phase 1

Le serveur pousse les changements de tableau en **Server-Sent Events**. Le
front-end ouvre une connexion persistante et reçoit les mises à jour en quelques
secondes, sans attendre le prochain `fetch()`.

- **`GET /events`** : flux `text/event-stream` (`Access-Control-Allow-Origin: *`).
  À l'ouverture, un événement `update` avec le tableau courant est envoyé
  immédiatement. Un ping commentaire (`: ping`) est émis toutes les 25 s pour
  empêcher un proxy inactif de fermer la connexion.
- À chaque nouveau tableau, `lib/diff.js` compare l'ancien et le nouveau
  (`[roundIndex][matchIndex]`) et le serveur diffuse :
  - des événements typés — `kickoff` (passage en `live`), `goal` (score modifié
    en `live`), `fulltime` (passage en `final`) — chacun `{ type, round, idx, match }` ;
  - puis toujours un événement générique `update` avec le tableau complet.
- Au **premier démarrage** (aucun tableau précédent), aucun événement typé n'est
  généré, pour éviter un flood au lancement.

> **Une seule instance (rappel).** La liste des clients SSE vit en mémoire
> (`sseClients` dans `server.js`). C'est pour ça que PM2 doit rester en
> `instances: 1` : un second worker aurait sa propre liste et n'enverrait jamais
> les événements diffusés par l'autre.

Côté front (`index.html`), on s'abonne via
`new EventSource(<origine du serveur>/events)`, on écoute l'événement `update`
pour re-render immédiatement, et on conserve le `fetch()` périodique existant
comme filet de secours si le flux tombe (timeout proxy, redémarrage serveur,
navigateur sans `EventSource`). Le `service-worker.js` laisse passer le flux
`/events` sans l'intercepter (une réponse streaming ne doit pas être mise en
cache).

### Installation sur le serveur (`/opt/world-cup-data`)

```bash
npm install                     # express, dotenv, cors
cp .env.example .env            # puis renseigner FOOTBALL_DATA_API_KEY, PORT, PUBLIC_ORIGIN
pm2 start ecosystem.config.js   # instances: 1 — NE PAS clusteriser (état en mémoire)
pm2 logs world-cup-data         # doit montrer des fetchs réguliers
```

> **Une seule instance.** L'état en mémoire (clients SSE, voir Phase 1) impose
> `instances: 1` dans PM2. Ne jamais passer en cluster sans pub/sub partagé.

### Caddy

Remplacer le bloc `file_server` de `world-cup-data.pointvirgule.dev` par un
reverse-proxy vers le serveur Node :

```
world-cup-data.pointvirgule.dev {
    reverse_proxy localhost:3000
    header {
        X-Robots-Tag "noindex"
    }
}
```

### Optimisation rate-limit

`fetchAndBuildBracket` n'appelle l'API que dans une fenêtre autour d'un match
(`isInsideAMatchWindow`) dès qu'un tableau est déjà en mémoire, afin de rester
sous la limite de 10 req/min de football-data.org. Au premier démarrage (aucune
donnée), un fetch immédiat est effectué pour amorcer le tableau.

## Notes

- GitHub peut retarder légèrement les cron `schedule` en cas de forte charge sur
  la plateforme — ce n'est pas garanti à la seconde près, mais reste largement
  suffisant pour un score de foot.
- Si un repo est inactif pendant 60 jours, GitHub désactive automatiquement les
  workflows programmés ; un simple push ou un `Run workflow` manuel les
  réactive.
- Le script ignore volontairement les rounds qui ne sont pas une puissance de 2
  (matchs) et exclut la petite finale — seuls 32es → Finale sont affichés.
