import { describe, expect, it } from "vitest";
import { motionDuration, motionDurations } from "./motion";
import { overlayReduce } from "./components/shell/overlay";

describe("宿主动效常量", () => {
  it("quick/standard/layout 三档时长与 styles.css token 保持一致", () => {
    expect(motionDurations).toEqual({ quick: 120, standard: 180, layout: 240 });
    expect(motionDuration("quick")).toBe(120);
    expect(motionDuration("standard")).toBe(180);
    expect(motionDuration("layout")).toBe(240);
  });
});

describe("宿主 overlay phase 状态机（纯函数）", () => {
  const closed = { mounted: false, phase: "closed" as const };

  it("closed 打开后进入 entering 并挂载", () => {
    expect(overlayReduce(closed, true)).toEqual({ mounted: true, phase: "entering" });
  });

  it("entering 保持挂载，进入阶段后由 rAF 推进为 open（不在此函数内）", () => {
    const entering = { mounted: true, phase: "entering" as const };
    expect(overlayReduce(entering, true)).toEqual(entering);
  });

  it("open 关闭后进入 exiting，保持挂载供退场 DOM 保留", () => {
    const open = { mounted: true, phase: "open" as const };
    expect(overlayReduce(open, false)).toEqual({ mounted: true, phase: "exiting" });
  });

  it("exiting 保持，超时后由 hook 卸载并回到 closed", () => {
    const exiting = { mounted: true, phase: "exiting" as const };
    expect(overlayReduce(exiting, false)).toEqual(exiting);
  });

  it("closed 重复关闭不改变状态，不残留退出路径", () => {
    expect(overlayReduce(closed, false)).toEqual(closed);
  });
});