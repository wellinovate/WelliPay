# Handoff: WelliPay — Patient Healthcare Payments App (Android)

## Overview
WelliPay lets Nigerian patients see hospital bills, pay them (card, bank transfer, or wallet), keep receipts, manage dependants, fund per-person wallets, and view financial insights (spending, upcoming expenses, insurance utilisation, savings goals, installment plans). English + Nigerian Pidgin throughout.

## About the Design Files
The files here are **design references built in HTML** — a clickable prototype showing intended look and behaviour, not production code. Recreate them in the target codebase (e.g. Kotlin/Jetpack Compose, React Native, Flutter) using its established patterns. If no codebase exists, Jetpack Compose or React Native are good fits.

Open `WelliPay Prototype.dc.html` in a browser (serve the folder over a local server, e.g. `npx serve`). The left rail jumps to any screen; the phone is fully interactive.

## Fidelity
**High-fidelity.** Final colours, type, spacing, copy and interactions. Match closely using the tokens below.

## Design Tokens (Broadsheet design system)
Type: **Source Serif 4** everywhere (headings weight 600, body 400, true italic). No sans-serif.

Colours
- Background `#f3f2f2`, surface `#eae9e9`, text `#201e1d`, divider = text @16%
- Accent (cyan, interactive): base `#0088b0`; 100 `#e9f8ff`, 200 `#cbeeff`, 300 `#99e0ff`, 400 `#62c5ee`, 500 `#38a6cf`, 600 `#1186ac`, 700 `#006786`, 800 `#004961`, 900 `#0a303e`
- Accent‑2 (magenta, errors/rare spot): base `#d6006c`; 100 `#fff1f4`, 200 `#ffdee6`, 300 `#ffc0d0`, 400 `#ff90b1`, 500 `#ff458e`, 600 `#d82071`, 700 `#aa0b56`, 800 `#790e3d`, 900 `#4b1528`
- Neutral: 100 `#f8f4f4`, 200 `#eae7e7`, 300 `#d7d3d3`, 400 `#bab6b6`, 500 `#9b9797`, 600 `#7d7979`, 700 `#605d5d`, 800 `#444141`, 900 `#2d2b2b`
- Process yellow `#edbb00` — pending/processing status pill only

Spacing: 5 / 10 / 15 / 20 / 30 / 40 px (space‑1,2,3,4,6,8)
Radius: sm 1px, md 2px, lg 4px (pills/chips/toggles use full round)
Shadows: sm `0 1px 2px #2d2b2b24`, md `0 3px 10px #2d2b2b29`, lg `0 12px 32px #2d2b2b38`

Rules: use cyan for interactive, magenta sparingly (errors, destructive); never both accents in one small component. Accent text at paragraph size uses accent‑700. Focus ring: 2px accent outline, 2px offset. Disabled = 45% opacity. Icons: Phosphor, duotone weight.

Status pill colours: Paid = accent‑100 bg / accent‑800 text; Partly paid / Pending = process yellow / neutral‑900; Failed = accent‑2‑100 / accent‑2‑800; Expired = neutral‑200 / neutral‑700.

## Navigation
Bottom tab bar, 6 tabs: **Home, Bills, Wallet, Insights, Payments, Profile**. Active tab in accent. A person-switcher chip on Home (avatar + name) opens a bottom sheet to change the active person (Jay Umar — self; Ade Okoro, Faith Oghene — dependants). Bills, wallets, insights scope by active person.

## Screens
IDs match the prototype rail.

**Sign in & onboarding**
- S01 Welcome — logo, value line, "Get started", language toggle (English/Pidgin).
- S02 Phone — +234 prefix, 10-digit input; validation error for invalid length.
- S03 OTP — 6 digits, resend countdown, wrong-code error, expired-code state.
- S04 Profile — full name, date of birth, email (optional).
- S05 App lock — set 4-digit PIN (enter + confirm, mismatch error), option to enable biometrics.
- S06 Link WelliRecord — link existing hospital record (loading, success, not found) or skip.
- S06b Create wallet — explains wallet; "Create my wallet" or "Skip for now".

**Home & bills**
- S07 Home — person chip, next-due bill hero card with "Pay now", wallet balance card (→ Wallet), recent bills, "Add a bill".
- S08 Notifications — list of bill/payment/receipt events with icons; empty state.
- S09 Bills — filter chips (All / Due / Paid), bill cards with facility, bill no., amount, status pill; empty state.
- S10 Bill detail — facility, bill no., date, line items (collapsed after 3, "Show all"), HMO split if present, amount due, "Pay this bill", "Report a problem".
- S12 Add bill — enter bill number or scan; not-found error.

**Payment**
- S13 Choose amount — full vs part; part-payment validation (min part amount, not above balance).
- S14 Method — Pay from wallet (disabled with "Not enough balance" when insufficient), Card, Bank transfer. Cancelled-payment banner on return.
- S15 Confirm — "You are paying" amount + subtitle, method, PIN keypad confirmation (wrong PIN error, lockout).
- S16 Card payment — spinner "Opening secure payment", card form sheet (card number, expiry, CVV) with amount + facility header, pay button; 3‑D Secure step; declined → failed status.
- S17 Bank transfer — one-time account (bank "Any Bank", account name WelliPay), copy buttons, 60‑min countdown, "I've sent it", expiry state.
- S18 Payment status — centred 60px circular icon + heading. States: pending (spinner, yellow), successful, failed (reason + retry), expired, under review. Success actions: View receipt / Pay balance (if part-paid) / Back to bills. For wallet top-up, savings, installment: single "Go to wallet" / "Go to insights".
- S19 Receipt — reference, date/time, facility, amount paid, method, share/download.
- S20 Payment history — list with status pills; empty state.
- S21/22 Report a problem & status — category choice (Wrong amount, Already paid, Duplicate, Other), description, submit → ticket view "Under review".

**Wallet**
- S23 Wallet — per-person balance (Jay seeded ₦15,000), Top up, Auto-pay toggle (+ demo "Run auto-pay" if an eligible bill fits balance), activity list.
- S24 Top up amount — preset chips ₦5,000/10,000/20,000/50,000 + custom input (min ₦500) → Method (card/transfer) → Confirm → Status. Same screen reused for savings contributions ("Contribute to savings").

**Insights**
- S25 Insights — scope chips Just me / Whole family.
  - Spending, last 4 months: total + vertical bar chart (Jun–Sep), bars accent‑600.
  - Family spending (family scope only): horizontal bars per person.
  - Upcoming expenses: unpaid bills sorted by date, tap → bill detail; "Manage reminders" → notification prefs.
  - Insurance utilisation: stacked bar, HMO paid (accent‑600) vs you paid (neutral‑300).
  - Savings goal: "Surgery fund" ₦32,000 / ₦100,000, progress bar, Contribute.
  - Financing obligations: installment plans (e.g. 1 of 4 paid, ₦10,000 per installment, next due date), "Pay next installment" → Method (wallet allowed).

**People & profile**
- S36 People — list of persons, active tick, "Add a person".
- S37 Add dependant — name, relationship chips (Child/Spouse/Parent/Other), DOB; name required.
- S42 Profile hub — avatar, name, phone, menu: People, Security, Privacy, Notifications, Language, Help, Contact, Legal; Delete account; Log out.
- S43 Security — biometric toggle, change PIN.
- S44 Privacy — share bills with HMO, marketing toggles.
- S45 Notification prefs — new bill alerts, receipts, promotions.
- S46 Language — English / Pidgin (whole app switches).
- S47 Help (FAQs), S48 Contact (call, WhatsApp, email), S49 Legal (terms, privacy, refund).
- S50 Delete account — warning → final confirm → done.

## Interactions & Behaviour
- Payment pipeline is shared across contexts: `bill | topup | savings | installment`. Success updates bill balance/status, wallet balance, savings saved, or plan paidInstallments accordingly; wallet-method payments deduct balance and skip the gateway.
- Card gateway loading ~900ms before form appears.
- Toggles: 44×26 track (accent‑700 on / neutral‑300 off), 20px white thumb.
- Transfer countdown ticks every second; expiry → expired status.
- Language switch re-renders all copy (strings in the `t` dictionary inside the prototype's logic class, `L(en, pcm)`).

## State (suggested model)
User, persons[], activePersonId, bills[] (personId, facility, billNo, date, lines, amountTotal, amountDue, minPart, hasSplit, hmoAmount, status), payments[], wallets{personId: balance}, walletAutoPay{}, walletTxns[], savingsGoal{name,target,saved}, financingPlans[] (installments, paidInstallments, perInstallment, nextDue), notification & privacy prefs, language, current payment session (context, amount mode, method, outcome, reference).

## Assets
- Avatars: placeholder photo slots (replace with user photos / initials fallback).
- Icons: Phosphor duotone (tab bar icons in prototype are Phosphor paths).
- Font: Source Serif 4 (Google Fonts).

## Files
- `WelliPay Prototype.dc.html` — the full prototype (template + logic class with all copy, seed data, state logic).
- `support.js`, `android-frame.jsx`, `image-slot.js` — prototype runtime/frame helpers (not for production).
- `_ds/.../styles.css` — Broadsheet token sheet and component classes (`.btn`, `.card`, `.field`, `.input`, `.tag`, etc.).
