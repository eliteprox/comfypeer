import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CopyText } from "@/components/CopyText";
import { WorkflowDownload } from "@/components/WorkflowDownload";
import {
  COMFYPEER_OIDC_ISSUER,
  COMFYPEER_PUBLIC_CLIENT_ID,
  FIRST_RUN_WORKFLOW_ID,
  INSTALL,
  starterWorkflowById,
} from "@/lib/constants";
import { installHref } from "@/lib/install-request";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "Install Livepeer AI Streaming in ComfyUI Desktop, sign in with a ComfyPeer account, and run a starter workflow.",
};

const TOC = [
  { href: "#before-you-start", label: "Before you start" },
  { href: "#install", label: "Install" },
  { href: "#sign-in", label: "Sign in" },
  { href: "#starter-workflow", label: "Run a starter workflow" },
  { href: "#cost", label: "Know what it costs" },
  { href: "#website", label: "What the website is for" },
  { href: "#troubleshooting", label: "Troubleshooting" },
  { href: "#developers", label: "For developers" },
  { href: "#advanced", label: "Advanced overrides" },
] as const;

const TROUBLESHOOTING = [
  {
    see: "No Trickle nodes",
    do: "Restart ComfyUI, read the console, and clear __pycache__.",
  },
  {
    see: "Sign-in configuration error",
    do: `Update ${INSTALL.displayName} in Manager and restart.`,
  },
  {
    see: "No orchestrator available right now, try again",
    do: "Discovery came back empty. Retry, and check /network.",
  },
  {
    see: "Sign-in link expired",
    do: "Click Sign in on the canvas again.",
  },
  {
    see: "Signed in but the run fails",
    do: "The account is out of credit. Top up.",
  },
  {
    see: "Restarted ComfyUI and signed out",
    do: "Tokens are memory-only. Sign in again.",
  },
] as const;

export default function DocsPage() {
  const firstRun = starterWorkflowById(FIRST_RUN_WORKFLOW_ID);

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="On this page" className="lg:sticky lg:top-20 lg:self-start">
        <p className="text-xs font-medium uppercase tracking-wide text-faint">On this page</p>
        <ol className="mt-3 space-y-2 text-sm">
          {TOC.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="inline-flex min-h-11 items-center text-muted hover:text-fg">
                {item.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="min-w-0 max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Docs</h1>
        <p className="mt-2 text-muted">
          Install {INSTALL.displayName}, sign in, and run a graph. Agents:{" "}
          <Link href="/agents" className="text-cool hover:underline">
            /agents
          </Link>
          .
        </p>

        <section id="before-you-start" className="mt-10 scroll-mt-20 space-y-3">
          <h2 className="text-lg font-semibold text-fg">1. Before you start</h2>
          <p className="text-sm text-muted">
            ComfyUI Desktop on Windows or macOS, a webcam or a video file, and a browser. No
            environment variables are required.
          </p>
        </section>

        <section id="install" className="mt-8 scroll-mt-20 space-y-3">
          <h2 className="text-lg font-semibold text-fg">2. Install</h2>
          <p className="text-sm text-muted">
            In ComfyUI Manager, search for <span className="text-fg">{INSTALL.managerSearch}</span>.
            Or run the CLI, then restart ComfyUI. The Trickle category appears after the restart.
          </p>
          <CopyText label="Manager search" value={INSTALL.managerSearch} />
          <CopyText label="CLI" value={INSTALL.cliCommand} mono />
          <Button
            href={installHref("docs")}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-11"
          >
            Install in ComfyUI
          </Button>
        </section>

        <section id="sign-in" className="mt-8 scroll-mt-20 space-y-3">
          <h2 className="text-lg font-semibold text-fg">3. Sign in</h2>
          <p className="text-sm text-muted">
            Create a ComfyPeer account. In ComfyUI Desktop, {INSTALL.displayName} sits at the lower
            right. Choose Sign in and approve the code. The code is a device authorization (
            <a
              href="https://www.rfc-editor.org/rfc/rfc8628"
              className="text-cool hover:underline"
              rel="noopener noreferrer"
            >
              RFC 8628
            </a>
            ): the desktop app can prove this browser approved it without handling your password.
          </p>
          <p className="text-sm">
            <Link href="/signup" className="text-cool hover:underline">
              Create account
            </Link>
          </p>
        </section>

        <section id="starter-workflow" className="mt-8 scroll-mt-20 space-y-3">
          <h2 className="text-lg font-semibold text-fg">4. Run a starter workflow</h2>
          <p className="text-sm text-muted">
            Download the first-run graph{firstRun ? ` (${firstRun.title}, needs ${firstRun.needs})` : ""},
            drag it onto the canvas, and queue the prompt. Frames leave through TrickleFrameOutput.
          </p>
          {firstRun ? (
            <p>
              <WorkflowDownload
                id={firstRun.id}
                className="inline-flex min-h-11 items-center text-sm text-cool hover:underline"
              >
                Download {firstRun.title}
              </WorkflowDownload>
            </p>
          ) : null}
        </section>

        <section id="cost" className="mt-8 scroll-mt-20 space-y-3">
          <h2 className="text-lg font-semibold text-fg">5. Know what it costs</h2>
          <p className="text-sm text-muted">
            The balance is on the canvas and on{" "}
            <Link href="/app/usage" className="text-cool hover:underline">
              /app/usage
            </Link>
            . Desktop model rates are not yet measured, so this page does not quote one.
          </p>
        </section>

        <section id="website" className="mt-8 scroll-mt-20 space-y-3">
          <h2 className="text-lg font-semibold text-fg">6. What the website is for</h2>
          <p className="text-sm text-muted">
            The site is the account: billing, usage, API keys, and device approval. The stream runs
            in ComfyUI Desktop. The browser studio at{" "}
            <Link href="/app/studio" className="text-cool hover:underline">
              /app/studio
            </Link>{" "}
            uses the same account.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            <li>
              <Link href="/app" className="text-cool hover:underline">
                Account
              </Link>
            </li>
            <li>
              <Link href="/app/billing" className="text-cool hover:underline">
                Billing
              </Link>
            </li>
            <li>
              <Link href="/app/usage" className="text-cool hover:underline">
                Usage
              </Link>
            </li>
            <li>
              <Link href="/app/keys" className="text-cool hover:underline">
                API keys
              </Link>
            </li>
          </ul>
        </section>

        <section id="troubleshooting" className="mt-8 scroll-mt-20 space-y-3">
          <h2 className="text-lg font-semibold text-fg">7. Troubleshooting</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wide text-faint">
                <tr>
                  <th className="px-4 py-3 font-medium">What you see</th>
                  <th className="px-4 py-3 font-medium">What to do</th>
                </tr>
              </thead>
              <tbody>
                {TROUBLESHOOTING.map((row) => (
                  <tr key={row.see} className="border-t border-border">
                    <td className="px-4 py-3 text-fg">{row.see}</td>
                    <td className="px-4 py-3 text-muted">
                      {row.see === "No orchestrator available right now, try again" ? (
                        <>
                          Discovery came back empty. Retry, and check{" "}
                          <Link href="/network" className="text-cool hover:underline">
                            /network
                          </Link>
                          .
                        </>
                      ) : row.see === "No Trickle nodes" ? (
                        <>
                          Restart ComfyUI, read the console, and clear{" "}
                          <span className="font-mono text-fg">__pycache__</span>.
                        </>
                      ) : (
                        row.do
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="developers" className="mt-8 scroll-mt-20 space-y-3">
          <h2 className="text-lg font-semibold text-fg">8. For developers</h2>
          <p className="text-sm text-muted">
            API keys are shown once: <span className="font-mono text-fg">pmth_…</span> for usage
            reads, and <span className="font-mono text-fg">app_…_…</span> for the signer and SDK.
            Agent registration is on{" "}
            <Link href="/agents" className="text-cool hover:underline">
              /agents
            </Link>
            .
          </p>
        </section>

        <section id="advanced" className="mt-8 scroll-mt-20 space-y-3">
          <h2 className="text-lg font-semibold text-fg">Advanced overrides</h2>
          <p className="text-sm text-muted">
            Leave these unset for a normal install. Set them only when you are pointing the nodes
            at a different issuer or orchestrator.
          </p>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <span className="font-mono text-fg">PYMTHOUSE_ISSUER_URL</span> — production value{" "}
              <span className="font-mono text-fg">{COMFYPEER_OIDC_ISSUER}</span>
            </li>
            <li>
              <span className="font-mono text-fg">COMFYPEER_PUBLIC_CLIENT_ID</span> — aliases{" "}
              <span className="font-mono text-fg">PYMTHOUSE_PUBLIC_CLIENT_ID</span> and{" "}
              <span className="font-mono text-fg">PYMTHOUSE_CLIENT_ID</span>. In production this must
              equal <span className="font-mono text-fg">{COMFYPEER_PUBLIC_CLIENT_ID}</span>.
            </li>
            <li>
              <span className="font-mono text-fg">ORCHESTRATOR_URL</span> — optional pin.
            </li>
          </ul>
        </section>
      </article>
    </div>
  );
}
