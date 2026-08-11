import "server-only";

export type StagingOrch = {
  id: string;
  url: string;
  label: string;
};

const DEFAULT_ORCHS: StagingOrch[] = [
  {
    id: "1",
    url: "https://liverunner-staging-1.daydream.monster:8936",
    label: "liverunner-staging-1",
  },
  {
    id: "2",
    url: "https://liverunner-2.daydream.monster:8936",
    label: "liverunner-2",
  },
  {
    id: "3",
    url: "https://liverunner-3.daydream.monster:8936",
    label: "liverunner-3",
  },
];

export function getOrchestrators(): StagingOrch[] {
  const fromList = process.env.ORCH_URLS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromList && fromList.length > 0) {
    return fromList.map((url, i) => {
      let label = `orch-${i + 1}`;
      try {
        label = new URL(url).hostname.replace(/\.daydream\.monster$/, "");
      } catch {
        /* keep default */
      }
      return { id: String(i + 1), url, label };
    });
  }
  const primary = process.env.ORCH_URL?.trim();
  if (primary) {
    return [{ id: "1", url: primary, label: "primary" }, ...DEFAULT_ORCHS.slice(1)];
  }
  return DEFAULT_ORCHS;
}

export function getPrimaryOrchestrator(): StagingOrch {
  return getOrchestrators()[0]!;
}
