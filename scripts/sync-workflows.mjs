/**
 * Copy this site's starter workflows into a local livepeer-ai-nodes checkout.
 *
 * ComfyPeer hosts the files in public/workflows and serves them at /go/workflow.
 * The nodes package links to those URLs. This script updates the installed
 * examples in the nodes repo so they match the site. It does not read the
 * nodes repo as a source.
 *
 * The scan rejects personal orchestrator hosts, home-directory paths, bearer
 * tokens, private keys, and credential-shaped assignments. Orchestrator and
 * signer fields in a starter graph stay blank so Desktop uses discovery.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.resolve(HERE, "../public/workflows");
const DEST = path.resolve(
  process.env.WORKFLOWS_DEST ?? path.resolve(HERE, "../../livepeer-ai-nodes/workflows"),
);

const EXPECTED = [
  "Stream Video File - noop.json",
  "Stream Video File - sdxl.json",
  "Stream Video Frames - noop.json",
  "Stream Video Frames - sdxl.json",
  "Image I-O.json",
  "Livepeer Text to Speech.json",
];

const FORBIDDEN = [
  { name: "home path", pattern: /\/home\/[A-Za-z0-9._-]+/ },
  { name: "macOS home path", pattern: /\/Users\/[A-Za-z0-9._-]+/ },
  { name: "Windows home path", pattern: /[A-Za-z]:\\Users\\/ },
  { name: "pmth token", pattern: /pmth_[A-Za-z0-9]/ },
  { name: "bearer token", pattern: /Bearer\s+[A-Za-z0-9._~+/-]+=*/i },
  { name: "stripe secret", pattern: /\bsk_(live|test)_[A-Za-z0-9]+/ },
  { name: "aws access key", pattern: /AKIA[0-9A-Z]{16}/ },
  { name: "private key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "assigned api key", pattern: /api[_-]?key["']?\s*[:=]\s*["'][^"']+/i },
  { name: "assigned password", pattern: /password["']?\s*[:=]\s*["'][^"']+/i },
  { name: "assigned secret", pattern: /secret["']?\s*[:=]\s*["'][^"']+/i },
  { name: "personal orchestrator host", pattern: /eliteencoder\.net/ },
];

mkdirSync(DEST, { recursive: true });

const files = {};
for (const name of EXPECTED) {
  const sourcePath = path.join(SOURCE, name);
  let text;
  try {
    text = readFileSync(sourcePath, "utf8");
  } catch {
    console.error(`missing workflow: ${sourcePath}`);
    process.exit(1);
  }
  JSON.parse(text);
  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(text)) {
      console.error(`refusing ${name}: contains ${rule.name}`);
      process.exit(1);
    }
  }
  writeFileSync(path.join(DEST, name), text);
  files[name] = createHash("sha256").update(text).digest("hex");
}

const manifest = {
  source: "comfypeer/public/workflows",
  files,
};
writeFileSync(path.join(SOURCE, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.error(`copied ${EXPECTED.length} workflows from ComfyPeer into ${DEST}`);
