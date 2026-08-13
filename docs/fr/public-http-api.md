# API HTTP publique (concentrateur PoS)

## À quoi ça sert

be-BOP peut servir de **concentrateur** pour un ou plusieurs points de vente (caisses, chargeurs de bracelets, bornes partenaires). Ces systèmes parlent à be-BOP via une API HTTP versionnée et authentifiée (`/api/v1`), pas via une session utilisateur.

Boucle typique :

1. Le partenaire crée une clé API dans l’admin (scopes + CORS).
2. La caisse **lit le catalogue** (`GET /api/v1/catalog/products`).
3. La caisse **écrit les commandes payées** par lot (`POST /api/v1/orders`).
4. Un autre système (ex. chargeur de bracelets) **interroge les commandes payées** (`GET /api/v1/orders/paid`) — c’est une **lecture**, pas un webhook.

Le checkout vitrine reste Face B (cookies / session). Ne pas mélanger les deux.

OpenAPI interactif : [`/api/v1/docs`](/api/v1/docs) (schéma [`/api/v1/openapi.json`](/api/v1/openapi.json)).

## Créer une clé (Admin → API Keys)

1. Se connecter en Super Admin.
2. Ouvrir **Admin → API Keys**.
3. Créer une clé : nom (ex. « Caisse entrée »), et scopes.
4. Copier le secret immédiatement. Il n’est montré qu’une fois. be-BOP ne stocke que `SHA-256(secret)`.
5. Enregistrer les origines CORS sur la même page (une par ligne). Vide = aucun accès navigateur cross-origin. `*` n’est jamais autorisé.

Envoyer le secret en `Authorization: Bearer <secret>` ou `X-Api-Key: <secret>`. Clé absente/invalide → 401. Mauvais scope → 403.

## Scopes

| Scope          | Endpoints                                                           |
| -------------- | ------------------------------------------------------------------- |
| `orders:write` | `POST /api/v1/orders`                                               |
| `catalog:read` | `GET /api/v1/catalog/products`, `GET /api/v1/catalog/products/{id}` |
| `orders:read`  | `GET /api/v1/orders/paid`                                           |

N’accorder que le nécessaire. Une borne catalogue-only ne doit pas recevoir `orders:write`.

## CORS

Les appels navigateur cross-origin sont sur liste blanche. Les appels serveur à serveur (sans en-tête `Origin`) ne sont pas concernés. Fail-closed : une origine inconnue n’obtient pas `Access-Control-Allow-Origin`.

## Lecture catalogue

`GET /api/v1/catalog/products?type=resource&tags=tag-a,tag-b&limit=20&cursor=…&lang=fr`

DTO stable : id, alias, type, nom/description courte traduits, prix en **unités mineures**, flag PWYW, livraison, tags, variations, stock disponible. Les produits cachés (ni eShop ni retail) sont omis.

## Écriture commandes

Voir [écriture commandes v1](./api/v1-orders-write.md). Lot, idempotent sur `(apiKey, externalOrderId)`.

## Lecture commandes payées (poll)

`GET /api/v1/orders/paid?since=…&until=…&limit=20&cursor=…`

Uniquement les commandes avec au moins un paiement **paid**. Le payload contient les lignes produit, l’éventuel `uniqueKey` (vitrine `?key=`), et le montant **réellement payé**. Ce n’est pas un webhook (issue #2689). Le webhook produit #2646 ne suffit pas pour ce flux.

## Clé unique vitrine (`?key=`)

`/product/{slug}?key=kfdjsfeaz12845ND9xezj91820` présélectionne un secret d’artefact unique. Il est stocké sur la ligne panier puis copié sur la commande. Le pay-what-you-want et les variations légères cohabitent avec ce secret. Ce n’est **pas** une clé API ; c’est un identifiant produit côté client.

## Limites de débit

Par clé API, plus un filet IP. Les `429` incluent `Retry-After`.

## Versionnage

`/api/v1` est le contrat Face A actuel. Les ruptures iront sur `/api/v2`. Voir le [RFC spike API](./api/rfc-2616-public-api-spike.md).
