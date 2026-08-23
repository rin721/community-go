// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readRevealEnabled, Reveal, RevealList, revealRhythms, revealStaggerStep } from "./reveal";

function withDataset(apply: (dataset: DOMStringMap) => void, run: () => void) {
  const dataset = document.documentElement.dataset;
  const snapshot: Record<string, string | undefined> = {};
  for (const key of Object.keys(dataset)) snapshot[key] = dataset[key];
  apply(dataset);
  try {
    run();
  } finally {
    for (const key of Object.keys(dataset)) delete dataset[key];
    for (const [key, value] of Object.entries(snapshot)) if (value !== undefined) dataset[key] = value;
  }
}

describe("弹入响应（Reveal）", () => {
  it("节奏档位派生 duration/ease/offset", () => {
    expect(revealRhythms.calm.durationMs).toBeGreaterThan(revealRhythms.balanced.durationMs);
    expect(revealRhythms.playful.durationMs).toBeLessThan(revealRhythms.balanced.durationMs);
    expect(revealRhythms.playful.offsetPx).toBeGreaterThan(revealRhythms.calm.offsetPx);
    expect(revealRhythms.balanced.ease).toContain("cubic-bezier");
  });

  it("派生配置缺失或减少动效时关闭（元素始终可见）", () => {
    expect(readRevealEnabled()).toBe(false);
    withDataset((dataset) => { dataset.experienceReveal = "true"; }, () => expect(readRevealEnabled()).toBe(true));
    withDataset((dataset) => { dataset.experienceReveal = "true"; dataset.motion = "reduce"; }, () => expect(readRevealEnabled()).toBe(false));
    withDataset((dataset) => { dataset.experienceReveal = "false"; }, () => expect(readRevealEnabled()).toBe(false));
  });

  it("Reveal 渲染可见态并携带节奏属性", () => {
    const markup = renderToStaticMarkup(createElement(Reveal, { rhythm: "calm", className: "probe" }, createElement("span", null, "content")));
    expect(markup).toContain('data-reveal="shown"');
    expect(markup).toContain('data-reveal-rhythm="calm"');
    expect(markup).toContain("class=\"probe\"");
  });

  it("RevealList 按 index 派生 stagger delay", () => {
    const markup = renderToStaticMarkup(createElement(RevealList, null, createElement("div", null, "a"), createElement("div", null, "b")));
    expect(markup).toContain(`--reveal-delay:${0 * revealStaggerStep}ms`);
    expect(markup).toContain(`--reveal-delay:${1 * revealStaggerStep}ms`);
  });
});