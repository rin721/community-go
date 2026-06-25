# structure 目录说明

`structure` 存放目录地图和源码导航说明。它用于快速定位代码，不记录业务细节。

## 当前文档

| 文档 | 职责 |
| --- | --- |
| `directory-map.md` | 汇总仓库顶层目录、后端目录、前端目录、文档目录和脚本目录的职责。 |

## 维护规则

- 新增、删除或重命名重要目录时同步目录地图和相关 README。
- 目录地图应描述当前真实结构，不保留旧前端、旧插件或旧命令入口。
- 具体模块的开发细节放在 `docs/modules`、`docs/extension` 或目录 README，不塞进目录地图。

## 常用验证

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
```
