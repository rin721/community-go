import test from "node:test";
import assert from "node:assert/strict";
import { checkContextOwnershipStyles, checkStyleAuthority } from "./style-rules.mjs";

// 083 STYLE-083-001 反向测试：样式权威规则必须拒绝平台布局类重复与裸 :global 泄漏，
// 同时放行「模块根类前缀的模块专属 :global」（如 .opsModule :global(.ops-*)）。
test("083 style lint rejects platform layout class in module css (L1)", () => {
  const violations = checkStyleAuthority(".iamModule :global(.toolbar) { display: grid; }", "iam.module.css");
  assert.ok(violations.some((v) => v.includes("L1 platform layout class .toolbar")));
});

test("083 style lint rejects bare :global leak (L3)", () => {
  const violations = checkStyleAuthority(":global(.header-zone-action) { min-height: 28px; }", "ops.module.css");
  assert.ok(violations.some((v) => v.includes("L3 bare :global(.header-zone-action)")));
});

test("083 style lint allows module-owned :global with root prefix", () => {
  const violations = checkStyleAuthority(".opsModule :global(.ops-metric-card) { display: grid; }", "ops.module.css");
  assert.deepEqual(violations, []);
});

test("083 style lint allows module-local classes (no :global)", () => {
  const violations = checkStyleAuthority(".settingsRoot { display: grid; }", "settings.module.css");
  assert.deepEqual(violations, []);
});

// 086 STYLE-086-001 反向测试：token 化守护。
test("086 lint rejects raw token-equivalent colors (L2)", () => {
  const violations = checkStyleAuthority(".openapiModule .statusOk { color: #16a34a; }", "openapi.module.css");
  assert.ok(violations.some((v) => v.includes("L2 raw color #16a34a")));
});

test("086 lint rejects raw mono font stack (L2)", () => {
  const violations = checkStyleAuthority(".openapiModule code { font: 11px/1.6 ui-monospace, monospace; }", "openapi.module.css");
  assert.ok(violations.some((v) => v.includes("L2 mono font stack")));
});

test("086 lint allows mono stack through --font-mono (L2)", () => {
  const violations = checkStyleAuthority(".openapiModule code { font: var(--font-scale-11)/1.6 var(--font-mono); }", "openapi.module.css");
  assert.ok(!violations.some((v) => v.includes("L2 mono")));
});

test("086 lint rejects host component class override (L4)", () => {
  const violations = checkStyleAuthority(".iamModule :global(.ui-button) { min-height: 38px; }", "iam.module.css");
  assert.ok(violations.some((v) => v.includes("L4 host component class .ui-button")));
});

test("086 lint allows descendant context on host class (L4)", () => {
  const violations = checkStyleAuthority(".iamModule :global(.permission-key-col) .code-text-value { overflow: hidden; text-overflow: ellipsis; }", "iam.module.css");
  assert.deepEqual(violations, []);
});

test("086 lint rejects !important in module css (L5)", () => {
  const violations = checkStyleAuthority(".settingsModule .x { color: var(--danger) !important; }", "settings.module.css");
  assert.ok(violations.some((v) => v.includes("L5 !important")));
});

test("086 lint rejects unknown host token reference (L5)", () => {
  const violations = checkStyleAuthority(".opsModule .card { border: 1px solid var(--stroke); }", "ops.module.css");
  assert.ok(violations.some((v) => v.includes("unknown host token var(--stroke)")));
});

test("086 lint allows known token usage (regression guard)", () => {
  const violations = checkStyleAuthority(".openapiModule .tab { color: var(--text-secondary); border-radius: var(--radius-md); font-size: var(--font-scale-xs); }", "openapi.module.css");
  assert.deepEqual(violations, []);
});

test("086 lint passes module-owned :global with module root (regression guard)", () => {
  const violations = checkStyleAuthority(".opsModule :global(.diagnostic-card) { padding: var(--space-4); border-radius: var(--radius-md); }", "ops.module.css");
  assert.deepEqual(violations, []);
});

test("093 context lint rejects stale visual compensation", () => {
  const violations = checkContextOwnershipStyles(".data-card .data-table-wrap { margin-inline: -16px; } .search-input-icon { left: 8px; }", "styles.css");
  assert.equal(violations.length, 2);
});

test("093 context lint allows contextual owners", () => {
  assert.deepEqual(checkContextOwnershipStyles(".resource-index { border: 1px solid var(--border); }", "styles.css"), []);
});
