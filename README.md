<p align="center">
  <img src="apps/mobile/assets/images/kobo-mark.png" width="112" alt="Kobo Tracker logo">
</p>

<h1 align="center">Kobo Tracker</h1>

<p align="center">Every naira accounted for.</p>

Kobo Tracker is a local-first budget and expense tracker built around how money moves in Nigeria. It tracks actual cash separately from expected income, keeps the exchange rate used for each transaction, and lets households manage a shared budget without mixing up ownership.

This project is under active development. I am building it in public, including the product decisions, working code, tests, and unfinished parts.

## Why I am building it

Many budget apps assume one person, one stable currency, and a salary that arrives exactly when expected. Those assumptions do not hold for everyone. and it is hard to find an app that works well for households in Nigeria. Kobo Tracker is designed to handle: all the ways money moves in a household, multiple currencies, and the uncertainty of income and exchange rates.

Also it's just fun to build a local-first app with a Expo

Kobo Tracker makes different choices:

- A projected salary does not increase the actual balance until you confirm that it arrived.
- A past transaction keeps the rate used when you recorded it. Later currency moves do not rewrite history.
- Money uses integer minor units at every layer. Floating-point rounding cannot change a total.
- The API checks space membership before it returns or accepts financial data.
- The mobile app records changes locally and syncs them when the API is reachable.

## What works today

- Expense and income tracking with Nigerian spending categories
- Monthly category budgets and a radial spending summary
- Monthly, weekly, biweekly, and yearly recurring items
- Actual and projected month-end balances
- Private and shared spaces with invite codes and member roles
- Email and password accounts, Sign in with Apple, session refresh, sign-out, and account deletion
- NGN, USD, CAD, EUR, GBP, GHS, KES, and ZAR display currencies
- Cached exchange rates, offline fallbacks, and personal rate overrides
- Balance masking and optional minor-unit display
- Local WatermelonDB storage with authenticated PostgreSQL sync

## Project structure

| Path | What lives there |
| --- | --- |
| `apps/mobile` | Expo and React Native app, Expo Router screens, WatermelonDB, Skia charts, and native sheets |
| `apps/api` | NestJS API, authentication, shared spaces, sync endpoints, Drizzle, and PostgreSQL |
| `packages/shared` | Money arithmetic, currencies, recurrence rules, validation, and the shared sync manifest |

The mobile and API schemas share one manifest. Tests compare that manifest with PostgreSQL so a column change cannot silently break sync.

## Run it locally

### Requirements

- Node.js 20 or newer
- pnpm 10.32.1
- PostgreSQL
- Xcode for iOS or Android Studio for Android

WatermelonDB uses native code, so Kobo Tracker needs a development build. Expo Go cannot run this app.

### Install the workspace

```bash
git clone https://github.com/adokuru/budget-app.git
cd budget-app
corepack enable
pnpm install
```

### Start PostgreSQL and the API

Create separate development and test databases. The default configuration expects `kobo_dev` and `kobo_test` on local PostgreSQL.

```bash
createdb kobo_dev
createdb kobo_test
cp apps/api/.env.example apps/api/.env
pnpm --filter @budget/api db:migrate
DATABASE_URL=postgres://postgres@127.0.0.1:5432/kobo_test pnpm --filter @budget/api db:migrate
pnpm --filter @budget/api dev
```

Edit `apps/api/.env` if your PostgreSQL username, password, host, or database names differ. Email and password authentication works without OAuth credentials.

### Start the mobile app

The iOS Simulator can use the default API URL, `http://localhost:3000`.

```bash
pnpm --filter @budget/mobile ios
```

For the Android emulator, add this file before you build:

```dotenv
# apps/mobile/.env.local
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

For a physical device, replace the host with your computer's LAN address. The device and the computer must use the same network.

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000
```

Then run the native target:

```bash
pnpm --filter @budget/mobile ios
# or
pnpm --filter @budget/mobile android
```

## Test the workspace

```bash
pnpm typecheck
pnpm test
```

The API integration tests truncate every table in `TEST_DATABASE_URL`. Point that variable only at a dedicated test database.

## Open work

- Verify and tune the Android native build
- Add automated mobile interaction tests
- Show sync failures and conflicts in the interface
- Prepare beta builds and store metadata
- Publish real-device screenshots and a short demo

The order can change as the product gets used. Bugs that can lose money or expose another person's records come first.

## Build in public

I am sharing the reasoning with the implementation, not presenting a finished app as if it appeared fully formed. Open a [GitHub issue](https://github.com/adokuru/budget-app/issues) for a bug, a product question, or a use case that the current model misses.

If you want to contribute code, start with an issue so two people do not solve the same problem in different ways.

## License

This repository does not yet have a project-wide license. Public source is not permission to copy, distribute, or sell the code. All rights remain reserved until a license is added.
