# Page override: `/pipelines` (Remote models)

Route stays `/pipelines`. Title is Remote models.

## Job

List the remote models the nodes can call, keyed by `model_id` (`REMOTE_MODELS`), not by web-studio pipeline ids.

Intro: Remote models the nodes can call. Set model_id on TrickleConfig, or wire model_id_out from a pipeline config node.

## Cards

- Model id in mono, with a copy button (aria-live "Copied")
- Status
- Rate and TTFF only when measured. Otherwise "not yet measured".
- Link to a starter workflow

Do not add modality filters unless `REMOTE_MODELS` has fields those filters match.

## Web studio

A collapsed section, "Web studio pipelines", renders `PIPELINES` and labels them as the browser studio. Coming pipelines say "not yet measured" rather than borrowing placeholder numbers.
