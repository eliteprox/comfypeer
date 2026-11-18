import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  FIRST_RUN_WORKFLOW_ID,
  STARTER_WORKFLOWS,
  starterWorkflowById,
  workflowCostUsd,
} from "./constants";

describe("STARTER_WORKFLOWS", () => {
  it("puts Stream Video File - noop first and marks both noop graphs as first run", () => {
    assert.equal(STARTER_WORKFLOWS[0]?.id, FIRST_RUN_WORKFLOW_ID);
    assert.equal(STARTER_WORKFLOWS[0]?.file, "Stream Video File - noop.json");
    for (const workflow of STARTER_WORKFLOWS) {
      const firstRun = workflow.file.includes("noop");
      assert.equal(workflow.level, firstRun ? "first run" : "model");
    }
  });

  it("omits a 60-second cost until a rate constant exists", () => {
    for (const workflow of STARTER_WORKFLOWS) {
      assert.equal("rateUsdPerSec" in workflow, false);
    }
    assert.equal(workflowCostUsd({}), undefined);
    assert.equal(workflowCostUsd({ rateUsdPerSec: 0.001 }, 60)?.toFixed(3), "0.060");
  });

  it("vendors each file listed in the catalog", () => {
    const dir = path.join(process.cwd(), "public", "workflows");
    const files = new Set(readdirSync(dir));
    const route = readFileSync(path.join(process.cwd(), "app/go/workflow/route.ts"), "utf8");
    for (const workflow of STARTER_WORKFLOWS) {
      assert.equal(files.has(workflow.file), true, workflow.file);
      assert.equal(starterWorkflowById(workflow.id)?.file, workflow.file);
      assert.equal(route.includes(`case "${workflow.id}"`), true, workflow.id);
      assert.equal(route.includes(workflow.file), true, workflow.file);
    }
    const manifest = JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8")) as {
      files: Record<string, string>;
    };
    for (const workflow of STARTER_WORKFLOWS) {
      assert.equal(typeof manifest.files[workflow.file], "string");
    }
  });

  it("leaves orchestrator selection to discovery and does not pin a private video file", () => {
    const dir = path.join(process.cwd(), "public", "workflows");
    for (const workflow of STARTER_WORKFLOWS) {
      const text = readFileSync(path.join(dir, workflow.file), "utf8");
      assert.equal(text.includes("eliteencoder.net"), false, workflow.file);
      assert.equal(text.includes("2024-04-07 19-16-45.mp4"), false, workflow.file);
      const graph = JSON.parse(text) as {
        nodes: Array<{
          type: string;
          widgets_values_named?: Record<string, unknown>;
        }>;
      };
      for (const node of graph.nodes) {
        if (node.type === "TrickleConfig") {
          const values = node.widgets_values_named;
          assert.equal(values?.orchestrator_url, "");
          assert.equal(values?.signer_url, "");
          assert.equal(values?.use_comfypeer_account, true);
          assert.equal(values?.fps, 30);
          assert.equal(values?.keyframe_interval, 2);
          assert.equal(
            values?.model_id,
            workflow.file.includes("sdxl") ? "streamdiffusion-sdxl" : "comfystream",
          );
        }
        if (node.type === "LoadVideo") {
          assert.equal(node.widgets_values_named?.file, "");
        }
      }
    }
  });
});
