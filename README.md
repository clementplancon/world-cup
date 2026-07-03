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
  `buildRounds`, `fetchAndBuildBracket`). Partagée entre
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

## Notifications push (Web Push) — Phase 2

Le serveur peut envoyer une **notification navigateur** aux personnes qui
suivent une équipe, au **coup d'envoi** et à la **fin** de chacun de ses matchs
(volontairement **pas** sur les buts, pour éviter le spam — ceux-ci restent
diffusés en SSE sur la page ouverte).

- **`lib/push.js`** : stocke les abonnements dans `data/subscriptions.json`
  (`[{ endpoint, keys, followedTeam }]`, pas de base de données), les ajoute /
  supprime, et envoie les notifications avec `web-push`. Un endpoint mort
  (`410`/`404`) est automatiquement purgé.
- **`GET /api/vapid-public-key`** : clé publique VAPID en texte brut, nécessaire
  au `pushManager.subscribe()` côté navigateur.
- **`POST /api/subscribe`** : body `{ endpoint, keys, followedTeam }`.
- **`POST /api/unsubscribe`** : body `{ endpoint }`.
- Les endpoints `/api/*` sont **publics par design** (pas d'authentification).

Générer les clés VAPID **une seule fois** puis les renseigner dans `.env`
(`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT_EMAIL`) :

```bash
npx web-push generate-vapid-keys
```

Sans clés VAPID, le serveur démarre normalement mais le push est simplement
désactivé.

Côté front, le `service-worker.js` écoute `push` (`showNotification`) et
`notificationclick` (focus/ouverture de l'app), et un bouton 🔔 sur la puce de
suivi demande la permission, s'abonne via `pushManager.subscribe`, puis appelle
`POST /api/subscribe` avec l'équipe suivie. L'équipe suivie est mémorisée en
`localStorage` afin que l'abonnement survive à un rechargement.

## Image de partage dynamique (OG image) — Phase 3

Le serveur régénère toutes les 15 minutes une capture de l'arbre en cours, servie
comme image OpenGraph / Twitter pour que les partages sociaux montrent un tableau
à jour.

- **`lib/ogImage.js`** : Puppeteer ouvre `SITE_URL`, attend le rendu de l'arbre
  (`#bracket .match-node`) et capture `#bracket` dans `public/og-image.png`.
  Tout est encapsulé dans un try/catch : une génération ratée ne crashe jamais le
  serveur et ne supprime jamais l'image précédente (écriture atomique via un
  fichier temporaire).
- **`GET /og-image.png`** : sert l'image avec `Cache-Control: public, max-age=600`
  (et non `no-cache` comme `bracket.json`) — on **veut** que les crawlers sociaux
  la mettent en cache plutôt que de la re-télécharger à chaque partage.
- Côté front (`index.html`), `og:image` / `twitter:image` pointent vers
  `https://world-cup-data.pointvirgule.dev/og-image.png`.

> **Limite connue (pas un bug à corriger).** Facebook / X / Discord mettent
> l'aperçu en cache **par URL, côté plateforme**, parfois plusieurs heures. Un
> lien déjà partagé peut donc rester périmé sans action manuelle côté plateforme
> (ex. Facebook Sharing Debugger pour forcer un nouveau scrape).

### Installation sur le serveur (`/opt/world-cup-data`)

```bash
npm install                     # express, dotenv, cors, web-push, puppeteer
cp .env.example .env            # renseigner FOOTBALL_DATA_API_KEY, PORT, PUBLIC_ORIGIN,
                                # puis (Phase 2) VAPID_*, et (Phase 3) SITE_URL
npx web-push generate-vapid-keys  # une fois — copier les clés dans .env
pm2 start ecosystem.config.js   # instances: 1 — NE PAS clusteriser (état en mémoire)
pm2 logs world-cup-data         # doit montrer des fetchs réguliers
```

> **Puppeteer / Chromium.** La Phase 3 lance un Chromium headless. Sur un VPS
> minimal, installer les bibliothèques système requises (par ex.
> `libnss3 libatk-bridge2.0-0 libgtk-3-0 libasound2`, etc.) et laisser
> `puppeteer` télécharger son Chromium à `npm install`. Le lancement utilise
> `--no-sandbox` pour tourner sous un utilisateur de service.

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

### Fréquence des requêtes

`fetchAndBuildBracket` interroge football-data.org à **chaque** cycle : le
serveur sonde toutes les 2 min (`FETCH_INTERVAL_MS`), soit bien en dessous de la
limite de 10 req/min de football-data.org. Il récupère donc l'état courant en
permanence — match en cours ou non — sans logique de fenêtre autour des matchs.

## Notes

- GitHub peut retarder légèrement les cron `schedule` en cas de forte charge sur
  la plateforme — ce n'est pas garanti à la seconde près, mais reste largement
  suffisant pour un score de foot.
- Si un repo est inactif pendant 60 jours, GitHub désactive automatiquement les
  workflows programmés ; un simple push ou un `Run workflow` manuel les
  réactive.
- Le script ignore volontairement les rounds qui ne sont pas une puissance de 2
  (matchs) et exclut la petite finale — seuls 32es → Finale sont affichés.
