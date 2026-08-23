# Mobile design research for Kobo Tracker

Research date: 24 August 2026

Kobo Tracker should feel like a calm spending plan, not a mobile bank dashboard. The first screen should answer one question: how much can I still spend this month? Everything else supports that answer.

## What the strongest references do

- [YNAB's current mobile Home](https://support.ynab.com/en_us/spaces-in-the-mobile-app-S1iIZQoqgg) starts with actions and alerts, then pinned categories, goals, and a month summary. It keeps **Add Transaction** available from the main planning and spending areas.
- [Monzo Trends](https://monzo.com/help/monzo-perks/trends-spending-and-balance-web) combines a running balance, money in and out, upcoming payments, and an estimate of what is left to spend. It supports one monthly target plus category targets.
- [Kuda's August 2026 redesign](https://www.kuda.com/blog/meet-the-new-kuda-app-built-for-more/) reduced steps on Home, grouped frequent actions, kept balance hiding close to the balance, and moved secondary products to dedicated pages. Its [Nigeria App Store listing](https://apps.apple.com/ng/app/kuda-free-transfer-payment/id1467373738) describes weekly and monthly budgets with categories such as food and transportation.
- [Copilot's App Store listing](https://apps.apple.com/us/app/copilot-track-budget-money/id1447330651) separates a glanceable dashboard from detailed transactions and recurring charges. Copilot is US-only, so its interaction hierarchy is useful but its account-linking assumptions are not.
- [PiggyVest](https://apps.apple.com/ng/app/piggyvest-save-invest-today/id1263117994) and [Cowrywise](https://apps.apple.com/ng/app/cowrywise-save-invest-money/id1436590033) use familiar Nigerian goals and schedules: rent, school fees, emergency funds, group goals, and daily, weekly, or monthly contributions. Kobo should borrow that vocabulary without becoming an investment app.

The useful visual references are:

- [Purrweb's budgeting concept](https://dribbble.com/shots/27649360-Budgeting-App-Mobile-iOS-App-Design): live balance, category envelopes, limit warnings, and an end-of-month forecast.
- [Pankaj Subedi's finance concept](https://dribbble.com/shots/26521351-Finance-Budgeting-App-Clean-Modern-UI): balance-first hierarchy, category icons, transaction search, and a persistent add action.
- [Layo's finance cards](https://dribbble.com/shots/27262539-Finance-app-ui-cards): current balance, spending breakdown, recent activity, and functional category color.
- [Keitoto's budget management concept](https://dribbble.com/shots/27361519-Personal-Budget-Management-Smart-Spending-Expense-Tracking): quick expense entry, category limits, circular summaries, and bottom-sheet editing.

These shots are visual prompts, not proof of usability. Borrow their hierarchy and spacing. Do not copy the glass effects, chart density, or invented AI features.

## Preserve

- Keep **Left to spend** as the largest figure on Home. Keep actual money separate from projected income, and keep the existing "expected, not yet" treatment for unconfirmed salary. This matches Monzo's useful balance model while preserving Kobo's stricter money semantics.
- Keep the current Nigeria-first categories, including Food, Transport, Bills and PHCN, Data and Airtime, Rent, School fees, Family support, Health, and Ajo or savings.
- Keep category rows scannable: emoji or icon, name, amount left, amount spent, and a progress bar. The text must still explain an over-budget state when color is unavailable.
- Keep the amount-first add sheet, numeric keypad, category picker, optional note, success haptic, and immediate return to context. Keep the 48-point floating add button and its accessibility label.
- Keep Home, Budget, Recurring, and Settings as four stable top-level destinations. [Apple's tab-bar guidance](https://developer.apple.com/design/human-interface-guidelines/tab-bars) reserves the tab bar for navigation, so keep **Add entry** above the bar rather than turning it into a tab.
- Keep native tabs. [Expo Native Tabs](https://docs.expo.dev/router/advanced/native-tabs/) uses the system tab bar, though the API is still alpha and may change.
- Keep balance masking, brief press feedback, success haptics, and reduced-motion fallbacks. [Apple's motion guidance](https://developer.apple.com/design/human-interface-guidelines/motion) recommends brief, purposeful, optional motion.

## Change

### Fix state clarity first

`apps/mobile/src/db/hooks.ts` starts every observed query as an empty array. Home and Budget can therefore show a real empty state before the first local result arrives.

- Give queries an explicit initial-loading state.
- Keep the page frame and balance region stable while data loads.
- Show a restrained placeholder or activity indicator only where data is missing.
- Mark the region busy for assistive technology. [React Native accessibility](https://reactnative.dev/docs/accessibility.html) supports `accessibilityState.busy`, live-region announcements, labels, roles, and numeric or text values for progress controls.
- Show "Nothing logged yet" only after the local query has completed with zero records. Keep one clear action: **Add your first expense**.
- During background sync, retain local data and show a small sync status. Do not replace the dashboard with a blocking loader. [Apple's loading guidance](https://developer.apple.com/design/human-interface-guidelines/loading) recommends showing content or placeholders as soon as possible and letting people continue other work.

### Make Home more decisive

- Keep this order: left to spend, budget progress, income/spent/projected summary, urgent action, top spending categories, recent entries, upcoming payments.
- Show only the categories and recurring items that need attention. Link to the full Budget or Recurring screen for the rest.
- Treat overspending, an unconfirmed income item, and a sync failure as actions with plain text. Do not rely on red, amber, or animation alone.
- Use charts only when they answer a question faster than the existing rows. A single monthly progress or forecast view is enough. Category lists remain better for exact amounts.

### Make quick add keep context

- Keep the shortest path as amount, category, save.
- If entry starts from a category, preselect that category.
- After save, announce success and update the balance and category in place.
- Keep date, currency, recurrence, and advanced details available, but do not put them in the default path.

### Keep auth short and native

- Keep the mark, the line "Every naira accounted for", email and password, and native Apple sign-in on one screen. Avoid onboarding slides before sign-in.
- Add Google sign-in only when the backend contract and account-linking rules are ready. [Expo's Google authentication guide](https://docs.expo.dev/guides/google-authentication/) says the current native integrations require a development build and recommends Android Credential Manager over the deprecated legacy Android SDK.
- Use Google's official button or pre-approved asset. [Google's branding rules](https://developers.google.com/identity/branding-guidelines) require the standard color G, approved text, and visual prominence comparable to other third-party providers.
- Resolve the stored session before choosing the auth or app route. Keep the splash visible during that check so the sign-in screen does not flash for a returning user. See [Expo Router authentication](https://docs.expo.dev/router/advanced/authentication/).

### Finish the accessibility contract

- Support text scaling without clipping money, category names, or actions.
- Keep interactive targets at least 44 by 44 points on iOS. See [Apple accessibility guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility).
- Give icon-only controls a label and role. Give budget bars a spoken value such as "Food, 62 percent used, 38,000 naira left."
- Pair every status color with text or shape. Kuda declares support for larger text and non-color differentiation in its App Store accessibility details, which is a useful local benchmark.
- Test the core flow with VoiceOver and TalkBack: sign in, reveal or hide the balance, add an expense, choose a category, save, review the updated budget, and switch tabs.

## Avoid

- Do not copy dark glass cards, gradients, or shadows onto every section. Kobo's white canvas, hairline rules, and green accent already make dense financial data easier to scan.
- Do not let a donut chart compete with the spendable amount. Use one chart at a time and keep exact amounts in text.
- Do not add bank balances, investments, loans, AI categorization, or bank-linking screens because reference apps have them. They do not serve Kobo's local-first budget model today.
- Do not hide the add action inside a menu, make users choose a transaction type before entering an amount, or ask for every optional field on each entry.
- Do not show empty-state copy while a query or session is unresolved.
- Do not animate every number or card on each database update. Motion should confirm a save, explain a transition, or draw attention to a changed state.

## Recommended order

1. Separate loading, empty, populated, sync-warning, and error states.
2. Audit Home hierarchy and cap secondary lists.
3. Add spoken values, text scaling checks, and non-color status cues.
4. Preserve category context in quick add.
5. Add Google sign-in only after its backend and native-build work is scheduled.

The old [AI budget tracker shot](https://dribbble.com/shots/27621412-Ai-Budget-tracker-app-design) did not load during this research pass, so this note does not use it as evidence.
