# Page override: `/` (Home)

> Overrides `MASTER.md` for the marketing homepage only.

## Job

Convert on installing Livepeer AI Streaming in ComfyUI Desktop. The hero is the install path.

## Hero composition (first viewport)

1. H1: Stream real-time video from ComfyUI Desktop.
2. Lede: install, sign in with a ComfyPeer account, send frames from your graph. Billed by the second.
3. Primary: Install in ComfyUI (`/go/install?source=hero`, new tab). Below 768px the primary becomes "Send me the install link" (copies the absolute install URL and offers a mailto share). No email collection.
4. Secondary: Create account when signed out, Account (`/app`) when signed in.
5. Manager search string and copyable CLI. Copy confirms with aria-live "Copied".
6. Line: ComfyUI Desktop runs on Windows and macOS.
7. Screenshot: `public/comfyui-text-to-speech.jpg`. Livepeer · Audio text-to-speech wired to Preview Audio, with a ComfyPeer account signed in. Caption: "Text-to-speech on the ComfyUI canvas, signed in with a ComfyPeer account." It is a still. There is no canvas video.

Touch targets are at least 44px.

## Below the fold

1. Three steps: Install, Sign in on the canvas, Run a starter workflow. Step 3 downloads Stream Video File - noop.
2. Remote model table from `REMOTE_MODELS`. Unmeasured rate and TTFF say "not yet measured".
3. Browser preview (`LiveDemoWidget`), caption exactly: "Simulated preview — runs in your browser, no GPU used". The ticker is "preview", and cost is "estimated at $X/s" from the featured web-studio pipeline rate.
4. Web studio latency table: only `PIPELINES` with status available. Picklist footnote stays with this section. A per-hour figure is computed from that measured rate and labelled as the web-studio passthrough rate.
5. Final CTA: Install Livepeer AI Streaming, and Create a free account (Account when signed in).

Do not publish an install-time claim. Do not say "$5 included".

## Dropped

Import-your-graph and bounded-portability sections are gone.
