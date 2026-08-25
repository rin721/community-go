// highlight is the module-internal syntax highlighting helper (R075-005):
// highlight.js core with only the JSON language registered, so the bundle stays
// light. Response bodies are untrusted text: escaping is always applied before
// the HTML is injected (highlight.js escapes by default; the fallback escapes
// explicitly).
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";

hljs.registerLanguage("json", json);

function escapeHTML(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

// highlightJSON returns escaped HTML for the JSON highlighter; failures fall
// back to escaped plain text (never raw body content).
export function highlightJSON(text: string): string {
  try {
    return hljs.highlight(prettyPrint(text), { language: "json" }).value;
  } catch {
    return escapeHTML(text);
  }
}

function prettyPrint(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}