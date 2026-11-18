# Page override: `/pricing`

## Job

One balance, billed by the second, shared by ComfyUI Desktop and the web studio.

## Structure

1. Plan ladder.
   - Free: Create account. The card does not promise credit. One sentence may say free credit for verified GitHub accounts is not available yet.
   - Pay as you go: prepaid.
   - Pro: Coming soon, and the control is disabled so it does not navigate to `/signup`.
   - Studio: disabled until a workspace primitive exists.
2. How the balance works: starter credit when granted, prepaid, optional auto top-up, link to `/app/billing`. Do not rewrite API `explain` copy.
3. Worked example only from an existing measured `PIPELINES` rate, labelled as that web-studio pipeline.
4. Estimate control uses available web-studio pipelines only.

## Do not

- Do not claim that stopping a workflow stops billing.
- Do not publish a Desktop model rate that has not been measured.
- Do not put "$5 included" or "Human-verified" on the free card.

## Typography

Prices, rates, and estimates stay in JetBrains Mono tabular. Display USD to 3 decimals.

## Color

Plan CTAs use `--color-live`. Do not use billing-warn on pricing cards.
