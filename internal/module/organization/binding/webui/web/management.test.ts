import { describe, expect, it } from "vitest";
import { flatten } from "./DepartmentsPage";
import zhCN from "./locale/zh-CN.json";
import enUS from "./locale/en-US.json";

// pageConsumedKeys 是组织三个页面实际消费的 webui.organization.* 键。
// 067 曾发生「页面消费键存在而 locale 只有无前缀键」导致的占位报错，
// 该用例把消费键与双语资源一一对应，防止同类缺失回归。
// 084 重写三页后键集同步更新（目录工作台/名录表格/两栏分配）。
const pageConsumedKeys = [
  "webui.organization.brand",
  "webui.organization.departments.title",
  "webui.organization.departments.description",
  "webui.organization.departments.directory.title",
  "webui.organization.departments.new",
  "webui.organization.departments.search",
  "webui.organization.departments.count",
  "webui.organization.departments.empty.title",
  "webui.organization.departments.empty.detail",
  "webui.organization.departments.create.title",
  "webui.organization.departments.create.helper",
  "webui.organization.departments.edit.title",
  "webui.organization.departments.saved",
  "webui.organization.departments.root",
  "webui.organization.positions.title",
  "webui.organization.positions.description",
  "webui.organization.positions.new",
  "webui.organization.positions.search",
  "webui.organization.positions.count",
  "webui.organization.positions.empty.title",
  "webui.organization.positions.empty.detail",
  "webui.organization.positions.create.title",
  "webui.organization.positions.create.helper",
  "webui.organization.positions.rename.title",
  "webui.organization.positions.rename",
  "webui.organization.positions.saved",
  "webui.organization.assignments.title",
  "webui.organization.assignments.description",
  "webui.organization.assignments.panel.kicker",
  "webui.organization.assignments.panel.title",
  "webui.organization.assignments.accounts",
  "webui.organization.assignments.search",
  "webui.organization.assignments.empty",
  "webui.organization.assignments.positions.hint",
  "webui.organization.assignments.save",
  "webui.organization.assignments.saved",
  "webui.organization.assignments.conflict",
  "webui.organization.assignments.revision",
  "webui.organization.createdAt",
  "webui.organization.saveChanges",
  "webui.organization.code",
  "webui.organization.name",
  "webui.organization.parent",
  "webui.organization.create",
  "webui.organization.active",
  "webui.organization.inactive",
  "webui.organization.archived",
  "webui.organization.archive",
  "webui.organization.restore",
  "webui.organization.account",
  "webui.organization.department",
  "webui.organization.positions.label",
  "webui.organization.status",
  "webui.organization.cancel",
  "webui.organization.saving",
  "webui.organization.confirmArchive",
  "webui.organization.error",
];

describe("Organization 管理页面", () => {
  it("按树层级生成稳定的部门列表", () => {
    const result = flatten([{ id: "root", code: "root", name: "总部", active: true, archived: false, version: 1, children: [{ id: "child", code: "child", name: "子部门", parentId: "root", active: true, archived: false, version: 1, children: [] }] }]);
    expect(result.map(({ item, depth }) => [item.id, depth])).toEqual([["root", 0], ["child", 1]]);
  });

  it("页面消费的翻译键在 zh-CN/en-US locale 中均有定义（无缺失键占位）", () => {
    for (const key of pageConsumedKeys) {
      expect(zhCN, `zh-CN missing: ${key}`).toHaveProperty(key);
      expect(enUS, `en-US missing: ${key}`).toHaveProperty(key);
    }
  });
});