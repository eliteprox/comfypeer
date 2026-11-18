import type { ReactNode } from "react";
import { starterWorkflowById } from "@/lib/constants";

export function WorkflowDownload({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const workflow = starterWorkflowById(id);
  if (!workflow) return null;
  return (
    <a
      href={`/go/workflow?id=${encodeURIComponent(workflow.id)}`}
      download={workflow.file}
      className={className ?? "text-cool hover:underline"}
    >
      {children}
    </a>
  );
}
