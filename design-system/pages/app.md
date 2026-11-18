# Page override: `/app` (Account) and `/app/studio` (Web studio)

## `/app` — account overview

Derived from the account, wallet, and usage APIs. No new database.

- Connection card: how to sign in on the ComfyUI Desktop canvas. It does not pretend to detect a live connection.
- Balance: included usage, then prepaid, when the wallet payload already exposes them. Missing numbers stay missing.
- Auto top-up status, with Turn on linking to `/app/billing`. Do not duplicate BillingPanel.
- Checklist from `accountChecklist`: Account created, Credit available, First stream, Auto top-up. Install and Desktop sign-in are not checkboxes. A first stream collapses the list to "All set" plus a usage link.
- Starter workflow download for Stream Video File - noop.
- Recent activity links to `/app/usage`. Show a request count only when it is greater than zero.
- Credit runway only when spendable balance and a measured Desktop rate both exist. There is no measured Desktop rate yet, so the sentence is omitted.

Signup and login `returnTo` defaults to `/app` (this overview), and must not replace a device-flow return path.

## `/app/studio` — web studio

`StreamStudio` stays here. One line on the page: the same account is what ComfyUI Desktop uses.

Shell nav: Account (`/app`), Stream (`/app/studio`), Models (`/pipelines`), Billing, Usage, API keys, Settings.

Data-dense: `--space-sm`/`md`, 12–14px UI text. Resolution remains the three presets.

| Event | UI |
|-------|-----|
| No spendable credit | Existing top-up banner |
| `at_risk` / `blocked` | Billing panel states, warm colors only there |

Do not invent a connected-desktop check or a runway from a web-studio rate.
