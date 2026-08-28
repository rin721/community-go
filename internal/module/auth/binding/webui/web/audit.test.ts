import { describe, expect, it } from "vitest";
import { auditDetailFields, outcomeTone } from "./AuditPage";

describe("Auth 审计结果色调", () => {
  it("succeeded 映射 available，denied 映射 degraded，failed 映射 unavailable", () => {
    expect(outcomeTone("succeeded")).toBe("available");
    expect(outcomeTone("denied")).toBe("degraded");
    expect(outcomeTone("failed")).toBe("unavailable");
  });

  it("审计详情使用翻译标签，同时保留稳定字段顺序", () => {
    const item = {
      eventId: 42,
      operation: "iam.accounts.list",
      action: "list",
      actorKind: "service",
      subjectHash: "subject-hash",
      resourceType: "account",
      resourceHash: "resource-hash",
      decision: "allowed",
      outcome: "succeeded",
      occurredAt: "2026-08-28T10:00:00.000Z",
    } as const;
    const fields = auditDetailFields(item, (key) => ({
      "webui.auth.audit.id": "编号",
      "webui.auth.audit.operation": "操作",
    }[key] ?? key));
    expect(fields[0]).toMatchObject({ label: "编号", value: "42" });
    expect(fields[1].label).toBe("webui.auth.audit.occurredAt");
    expect(fields[2]).toMatchObject({ label: "操作", value: "iam.accounts.list" });
  });
});
