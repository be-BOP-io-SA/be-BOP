# RFC spike : forme de l’API publique (#2616)

Statut : spike / décision. Pas une réécriture de la vitrine.

## REST vs GraphQL

**Rester REST sur Face A** (`/api/v1/*`, clé API, scopes explicites).

Face B reste la vitrine SvelteKit à session (cookies, CSRF, panier). Une couche GraphQL dupliquerait le panier/session et pousserait une réécriture headless que nous ne faisons pas.

Si un partenaire a besoin d’un langage de requête plus riche, l’ajouter en Face C derrière les mêmes clés — ne pas fusionner Face A et Face B.

## CORS et jetons

Les jetons Face A sont des **clés API** (`Authorization: Bearer` ou `X-Api-Key`), pas des JWT utilisateur.

Le CORS est une **liste blanche d’origines exactes** (Admin → API Keys). Liste vide = pas de cross-origin navigateur. `*` est rejeté à l’analyse.

Le serveur-à-serveur (sans `Origin`) n’a pas besoin de CORS.

## Polling vs webhooks Lightning

Les notifications Lightning / facture payée restent sur les processeurs de paiement existants (push vers be-BOP).

**Sortie** partenaire pour la fulfilment (charge bracelet, casier, etc.) :

- **Poll `GET /api/v1/orders/paid`** (cette PR, #2689). L’autre système fetch. Simple, rejouable, pas de trou firewall entrant chez le partenaire.
- Le **webhook sortant produit #2646** est un POST HMAC par produit. Ce n’est pas un substitut à la lecture des commandes payées : il part par produit, porte un secret sur le document produit, et est fire-and-forget.

Ne pas ajouter un second « webhook commande payée » générique en v1 tant que la latence du poll n’est pas un vrai problème.

## Versionnage

- Préfixe d’URL `/api/v1`. Champs additifs autorisés. Rupture → `/api/v2`.
- OpenAPI `/api/v1/openapi.json` = contrat.
- Dates : ISO-8601. Argent : unités mineures entières + devise ISO.

## Hors scope

Réécriture vitrine headless, GraphQL, remplacement du panier Face B, exposition des secrets `?key=` dans le DTO catalogue.
