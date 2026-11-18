import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { track } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = path.resolve(process.cwd(), "public", "workflows");

/**
 * Each branch reads a literal filename. The query id only selects the branch,
 * so a request cannot point readFile at another path.
 */
async function readStarterWorkflow(id: string): Promise<{ id: string; file: string; body: Buffer } | null> {
  switch (id) {
    case "stream-video-file-noop":
      return {
        id,
        file: "Stream Video File - noop.json",
        body: await readFile(path.join(ROOT, "Stream Video File - noop.json")),
      };
    case "stream-video-file-sdxl":
      return {
        id,
        file: "Stream Video File - sdxl.json",
        body: await readFile(path.join(ROOT, "Stream Video File - sdxl.json")),
      };
    case "stream-video-frames-noop":
      return {
        id,
        file: "Stream Video Frames - noop.json",
        body: await readFile(path.join(ROOT, "Stream Video Frames - noop.json")),
      };
    case "stream-video-frames-sdxl":
      return {
        id,
        file: "Stream Video Frames - sdxl.json",
        body: await readFile(path.join(ROOT, "Stream Video Frames - sdxl.json")),
      };
    case "image-io":
      return {
        id,
        file: "Image I-O.json",
        body: await readFile(path.join(ROOT, "Image I-O.json")),
      };
    case "livepeer-text-to-speech":
      return {
        id,
        file: "Livepeer Text to Speech.json",
        body: await readFile(path.join(ROOT, "Livepeer Text to Speech.json")),
      };
    default:
      return null;
  }
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  const workflow = await readStarterWorkflow(id);
  if (!workflow) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  track("workflow_download", { workflow: workflow.id });
  return new NextResponse(new Uint8Array(workflow.body), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(workflow.file)}`,
      "Cache-Control": "no-store",
    },
  });
}
