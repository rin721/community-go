// run-store is the pure execution state machine and response assembly for the
// debug panel (R075-005): the view owns fetch, everything else is plain data
// so it can be unit-tested without a browser. Response bodies are untrusted
// backend text; rendering must use text nodes or escaped HTML.

export type RunState =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "done"; result: RunResult }
  | { kind: "error"; message: string };

export type BodyClass = "json" | "html" | "text";

export type RunResult = {
  ok: boolean;
  status: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  body: string;
  sizeBytes: number;
  bodyClass: BodyClass;
};

// classifyBody guesses the response body flavour from its leading bytes.
export function classifyBody(text: string): BodyClass {
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (/^<(?:!doctype|html)/i.test(trimmed)) return "html";
  return "text";
}

// assembleRunResult fills derived fields (size + body class) from the raw
// fetch outcome.
export function assembleRunResult(input: {
  ok: boolean;
  status: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  body: string;
}): RunResult {
  const sizeBytes = new TextEncoder().encode(input.body).length;
  return { ...input, sizeBytes, bodyClass: classifyBody(input.body) };
}

// prettyJSON pretty-prints JSON bodies; non-JSON text is returned verbatim.
export function prettyJSON(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

// formatBytes renders a byte count with a compact unit suffix.
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}