# WelliPay ↔ EHR interoperability — design

This file documents the design implemented by `requireApiKey`, `POST /api/admin/integration-credentials`, and `POST /api/v1/encounters/orders` in `server.js`, and the supporting schema in `server/db.js` (`integration_credentials`, `patient_external_ids`, `loinc_code`/`cpt_code` on `master_service_directory`, `idempotency_key`/`source_vendor`/`patient_id` on `clinical_service_orders`).

The full scoping document, including the WelliRecord-specific phasing plan, lives in a Claude Docs artifact: https://claude.ai/artifact/N4fcr9uFoLd1i4o9ydeij2. This file is the subset relevant to reading the code.

## Why this matters

WelliPay's leakage-detection engine reads from `clinical_service_orders`, a table WelliPay owns and seeds itself. Without an ingestion path, it has no visibility into orders as clinicians actually place them in an EHR. A hospital running WelliPay alongside an EHR still has two disconnected systems: a clinician orders a lab test in the EHR, and nothing tells WelliPay that order exists until someone separately, manually bills it.

## Not an EHR-specific pipe

The ingestion API is generic, not built for one EHR. WelliRecord is the first integration, because it's the same company, not the only one. Coupling the design to WelliRecord's internal schema would cap WelliPay's market at whoever adopts WelliRecord.

What this means concretely:

1. **A versioned, published API.** `POST /api/v1/encounters/orders` is versioned from day one. External vendors integrate slower than an internal team and can't absorb breaking changes the same way.
2. **Anchor to an existing coding standard, not WelliPay's own codes.** `master_service_id` values like `LAB-HEM-FBC` only mean something inside WelliPay. Most EHRs track orders by LOINC (labs) and CPT (procedures). `master_service_directory` has `loinc_code`/`cpt_code` columns for this, left NULL until real codes are manually verified against actual registries — not guessed or fabricated. The order-resolution query in `POST /api/v1/encounters/orders` matches on `service_code`, `loinc_code`, or `cpt_code`, so a vendor can send whichever code it has.
3. **Per-facility API credentials.** Each hospital/vendor pairing gets its own API key (`integration_credentials`, key hashed with SHA-256, raw key shown once at issuance) and `provider_id` scope, independent of which EHR it runs. `provider_id` is always resolved server-side from the authenticated credential, never trusted from the request body.
4. **Patient matching is per-facility, not global.** `patient_external_ids` maps `(provider_id, external_patient_id)` to WelliPay's own patient id. A third-party EHR gets no assumption of a shared identity space with WelliPay — the ingestion endpoint accepts whatever identifier and demographics the external system sends and matches or creates against WelliPay's own patient table.
5. **FHIR is worth evaluating before finalizing a custom contract.** Not yet implemented. Flagged here so a future bespoke-contract change isn't a surprise: many EHRs are moving toward FHIR for order exchange, and a FHIR-shaped `ServiceRequest`/`Encounter` payload now would save a rebuild later.

## Idempotency

`clinical_service_orders` has a unique index on `(provider_id, idempotency_key)`. Ingestion is `ON CONFLICT ... DO NOTHING`, with a re-fetch on the zero-rows-returned case (a race between two concurrent identical submissions), never a blind insert. A vendor's retried delivery must not create a duplicate order, and a duplicate order must not silently double-count in the leakage dashboard.

## Patient identity — WelliRecord specifically

For WelliRecord, the longer-term plan is: WelliRecord's MRN becomes the primary patient identifier for new patients, with `PAT-XXXX` kept only as a legacy alias for records that predate the integration. For any other vendor, no such shared-identity assumption applies — see point 4 above.

## What's deliberately not built yet

- Point-of-care pre-authorization checking (WelliRecord calling back into WelliPay's Benefit Check engine before an order is confirmed).
- Bidirectional sync — WelliPay never writes back into an external EHR beyond a pre-auth read.
- Automated bulk EMPI merge without manual review.
- LOINC/CPT codes on `master_service_directory` — the columns exist and are read by the ingestion endpoint, but are unpopulated until verified against real registries.
