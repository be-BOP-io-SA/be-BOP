# API v1 — Ecriture de commandes

Version courte. Contrat detaille : [EN](../../en/api/v1-orders-write.md) + [ADR batch](../../en/api/adr-2687-batch-semantics.md) + [architecture](../../en/api/v1-architecture.md) + [ADR faces](../../en/api/adr-api-faces.md).

- POST /api/v1/orders — auth Bearer / X-Api-Key, scope orders:write
- Lecture catalogue : `GET /api/v1/catalog/products` (scope `catalog:read`). Lecture commandes payees : `GET /api/v1/orders/paid` (scope `orders:read`).
- Lot D : persistance via `writeBatch` / `writeOne` → HTTP 200 + `results[]`
- D1 fige : HTTP 200 + rapport par commande ; produits manquants → created + warning PRODUCT_MISSING ; global ok_with_warnings
- **D3 :** un appel crée une commande. Par défaut, une commande dont l'`externalOrderId` a déjà été envoyé par la même clé est refusée (`failed`, erreur `DUPLICATE_EXTERNAL_ORDER_ID`, avec l'`orderId` existant), et la commande existante n'est pas touchée : aucun paiement n'y est rapproché. L'option « Accepter plusieurs commandes avec le même identifiant externe » de la clé lève ce refus : chaque appel crée sa propre commande, qui garde son `externalOrderId`. Un cas reste refusé : une commande renvoyée avec le même `externalOrderId` et le même `createdAt` (`soldAt` côté caisse) est la même vente, donc un lot renvoyé n'écrit jamais une vente deux fois ; sans `createdAt`, rien ne la distingue d'une nouvelle vente et elle est écrite à chaque fois. L'option n'est possible que sur une clé sans droit de caisse (`pos:*`) : une caisse n'a jamais besoin de plusieurs commandes pour un même identifiant externe, l'admin refuse donc de la cocher sur une telle clé, et `POST /api/v1/pos/orders` répond toujours `conflict` pour une référence déjà reçue. Deux appels simultanés avec le même identifiant écrivent une seule commande ; si le premier n'a pas fini après quelques secondes, le second reçoit `EXTERNAL_ORDER_ID_IN_PROGRESS` (`details.retryable: true`) : aucune commande n'est encore connue, il faut renvoyer la commande.
- **Payée seulement si couverte :** `created` dit qu'une commande existe ; `orderStatus` dit où elle en est. Un paiement envoyé `paid` pour le montant attendu ou plus (ou inférieur d'une unité de devise au maximum, un centime en EUR, la tolérance que be-BOP applique à tout paiement) est enregistré payé pour le montant envoyé, et la commande est `paid`. En dessous, rien n'est enregistré comme payé : la commande et son paiement restent `pending`, l'avertissement `AMOUNT_MISMATCH` donne les deux montants, et la commande expire à l'échéance de paiement de la boutique si rien ne la complète. Un paiement envoyé `pending` laisse la commande `pending`, comme avant, sans échéance. Côté caisse, `POST /api/v1/pos/orders` répond `success` pour une vente dont la commande est payée et `pending` sinon. Chaque résultat de vente porte aussi `warnings`, sous la même forme que `POST /api/v1/orders`, quand son écriture a signalé quelque chose (par exemple `NOTIFICATIONS_NOT_DISABLED`) ; le champ est absent sinon.
- `externalOrderId` conservé sur la commande, sans unicité ; `createdAt` client écrit à l'insert `createOrder`.
- Gates e-shop (`isBillingAddressMandatory`, `collectIPOnDeliverylessOrders`) → `DOMAIN_ERROR` par commande ; canal Face A = `api` + `skipAutoDiscounts` (pas de remise auto boutique). **D11 :** commandes Face A `onLocation` — pas d'adresse de livraison exigee, meme pour des SKU `shipping: true`.
- Montants en unites mineures ; payment.method = point-of-sale ; pas de currencySnapshot client
- `notifications: false` sur une commande : be-BOP ne notifie personne à son sujet, ni le client ni la boutique. Les webhooks et les flux d'événements la transmettent quand même. La demande n'est suivie que pour une clé dont la case « Peut couper les notifications » est cochée (décochée par défaut) ; sinon be-BOP prévient comme pour toute commande et le signale par l'avertissement `NOTIFICATIONS_NOT_DISABLED`. Les alertes de challenge et de classement envoyées à la boutique sont des alertes internes à l'admin : elles partent quel que soit ce réglage.
- Clés créées et révoquées via UI admin (Settings → API Keys, super-admin)
- OpenAPI public : GET /api/v1/openapi.json ; Swagger UI : GET /api/v1/docs
- CORS allowlist admin `apiV1.corsOrigins`, stockee en base sans repli env, jamais wildcard
- Rate-limit : memoire in-process uniquement (pas de Redis) ; IP exclut GET health / openapi.json / docs et OPTIONS ; `Retry-After` = secondes restantes de la fenetre (pas fixe a 60)
- Face A (`/api/v1`) ≠ Face B (storefront session) — Bearer sur v1 = clé API uniquement

## Maintenance

| Route                                 | Pendant `isMaintenance`                    |
| ------------------------------------- | ------------------------------------------ |
| GET /api/v1/health                    | 200                                        |
| GET /api/v1/openapi.json              | 200                                        |
| GET /api/v1/docs                      | 200                                        |
| OPTIONS /api/v1/\*                    | 204                                        |
| POST /api/v1/orders                   | 503 MAINTENANCE                            |
| Autres routes `/api/v1` authentifiees | 503 MAINTENANCE (pas d'exemption publique) |
