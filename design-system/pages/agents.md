# Page override: `/agents`

## Job

Beat-two surface for MCP builders. The Ed25519 self-registration flow (#382) is live on staging and verified end to end, so the page is no longer gated.

Tool names on this page must match what the hosted MCP actually serves — verify against a live `tools/list` before editing, not from memory. The page previously advertised six tools that existed nowhere.

## Structure

1. MCP endpoint URL + copy
2. Registration snippet (Ed25519 challenge → one-time `app_*_*`)
3. **Prepay required** — agents do **not** get human $5 credit (#409)
4. `create_signer_session` → SDK token → local execution narrative
5. Point at the local client, `livepeer-python-gateway/examples/comfypeer-mcp`

## Voice

More developer-docs than marketing. Mono for all URLs, keys, tool names.

## CTA

`[ Prepay $10 ]` / `[ Copy MCP URL ]` — not "Start free."
