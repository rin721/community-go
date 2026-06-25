import type { HTMLAttributes } from "react";

import { cn } from "~/lib/cn";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("console-badge", className)} {...props} />;
}
