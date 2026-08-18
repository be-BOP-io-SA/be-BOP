# API v1 — Ecriture de commandes

Version courte. Contrat detaille : [EN](../../en/api/v1-orders-write.md) + [ADR batch](../../en/api/adr-2687-batch-semantics.md) + [architecture](../../en/api/v1-architecture.md) + [ADR faces](../../en/api/adr-api-faces.md).

- POST /api/v1/orders — auth Bearer / X-Api-Key, scope orders:write
- Lecture catalogue reportee a #2686 — pas de route stub dans cette surface
- Lot D : persistance via `writeBatch` / `writeOne` → HTTP 200 + `results[]`
- D1 fige : HTTP 200 + rapport par commande ; produits manquants → created + warning PRODUCT_MISSING ; global ok_with_warnings
- **D3 clarifie** : `duplicate` n'est pas toujours read-only — les effets paiement suivent les memes helpers domaine que l'admin confirm/cancel (`onOrderPayment` / `onOrderPaymentFailed` / `cancelPayment`) pour chaque paiement `pending` apparie au payload (`payment` ou `payments[]`) via `externalPaymentId` (**fortement recommande sur chaque paiement** pour retries PoS / reorder / splits), sinon `(amountMinor + currency + method)`, sinon index encore libre (seulement sans externalPaymentId). Paiement payload en plus avec nouvel `externalPaymentId` : `addOrderPayment` si commande `pending` et reste a payer ; sinon ignore. Erreur domaine pendant le settle → reste `duplicate` + warning `PAYMENT_SYNC_FAILED` (pas de HTTP 500 batch). Les autres champs ne sont pas reappliques.
- External ids + `createdAt` ecrits **atomiquement** a l'insert `createOrder` (pas de `$set` post-create pour external\*).
- Gates e-shop (`isBillingAddressMandatory`, `collectIPOnDeliverylessOrders`) → `DOMAIN_ERROR` par commande ; canal Face A = `api` + `skipAutoDiscounts` (pas de remise auto boutique). **D11 :** commandes Face A `onLocation` — pas d'adresse de livraison exigee, meme pour des SKU `shipping: true`.
- Montants en unites mineures ; payment.method = point-of-sale ; pas de currencySnapshot client
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
