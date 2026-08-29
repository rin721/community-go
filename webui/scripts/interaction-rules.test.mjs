import test from "node:test";
import assert from "node:assert/strict";
import { checkInteractionSource, interactionRuleFixtures } from "./interaction-rules.mjs";

test("092 rejects native interaction controls in page and shell source", () => {
  assert.ok(checkInteractionSource(interactionRuleFixtures.rejectNative, "fixture.tsx").some((item) => item.includes("raw interaction tag")));
});

test("092 rejects direct HeroUI/RAC imports outside SDK", () => {
  assert.ok(checkInteractionSource(interactionRuleFixtures.rejectDirectLibrary, "fixture.tsx").some((item) => item.includes("@webui/sdk/ui")));
});

test("092 allows semantic form and links", () => {
  assert.deepEqual(checkInteractionSource(interactionRuleFixtures.allowSemanticLayout, "fixture.tsx"), []);
});
