---
name: verify
description: Vérifier le site de réservation en le pilotant dans un vrai navigateur contre un mock de l'API /rsv
---

# Vérifier luxury-table-booking

Front Vite + React consommant l'API publique WelloResto `/rsv/{slug}` (repo
`ib-welloresto-api`, module `internal/modules/reservation`). Pas de slug de
démo connu sur le staging — utiliser un mock local fidèle au contrat.

## Recette qui fonctionne

1. **Mock API** : serveur Node http sur `:8787` reproduisant l'enveloppe
   `{id, data}` et les statuts métier (`"1"`, `"-1"`, `"0"`,
   `slot_unavailable`, …). Endpoints : open-hours, booking-availability,
   booking create/get/update/cancel, waitlist join/status/leave. CORS :
   autoriser header `Idempotency-Key`. Slug servi : `demo` (tout autre slug
   → `{status:"-1"}`). Le mock est stateful — le redémarrer entre deux runs
   pour des numéros de réservation prévisibles.
2. **Front** : `VITE_API_BASE_URL=http://localhost:8787 npm run dev` (bash).
   ⚠️ Les ports 8080/8081 sont souvent occupés → lire la sortie Vite pour
   le port réel (souvent 8082).
3. **Pilotage** : script Playwright (`@playwright/test` est en devDependency ;
   `npx playwright install chromium` si besoin). Le script doit être **dans
   le repo** (résolution node_modules), pas dans le scratchpad. Contexte
   `devices["iPhone 13"]` + `locale: "fr-FR"` — le site est mobile-first.
4. Staging réel pour valider l'enveloppe sans slug :
   `curl https://welloresto-api-staging.onrender.com/rsv/xxx/open-hours`
   → `{"id":"rsv.update.booking","data":{"status":"-1",...}}`.

## Sélecteurs / pièges Playwright

- Jour du calendrier react-day-picker :
  `page.locator("table").getByText("11", { exact: true })` — les classes
  `.rdp-day` sont écrasées par shadcn.
- `getByText("3 personnes")` matche aussi le sheet d'édition → `exact: true`.
- Branding : `#6d28d9` → `--primary` = `263 70% 50%` (arrondi hue 263).
- Flow « complet » (waitlist) : le mock renvoie tout indisponible à
  10 convives → cliquer 8× « Plus de convives ».

## Parcours à couvrir

Accueil (open-hours + branding + dimanches désactivés) → date → créneaux →
formulaire → confirmation (billet + toast warning doublon + Idempotency-Key
dans le log du mock) → modification (compteur remaining_updates) →
annulation (bandeau) → probes : numéro inconnu, slug inconnu → FindBooking
(localStorage) → waitlist join/suivi/sortie (jeton nettoyé).
