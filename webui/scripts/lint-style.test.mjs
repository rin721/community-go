import test from "node:test";
import assert from "node:assert/strict";
import { checkStyleAuthority } from "./style-rules.mjs";

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

test("083 style lint passes current clean module css (regression guard)", () => {
  // 平台类清零后 iam 仅保留 auth-panel/auth-heading/iam-form 模块专属
  const violations = checkStyleAuthority(".iamModule :global(.auth-panel) { padding: 8px; }", "iam.module.css");
  assert.deepEqual(violations, []);
});