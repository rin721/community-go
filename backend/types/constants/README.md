# types/constants 目录说明

`types/constants` 存放平台级稳定常量，例如应用名称、配置路径、HTTP header、运行时契约等跨层共享值。

## 归属规则

- 只放跨层共享且语义稳定的常量。
- 不放具体业务状态、业务枚举、数据库列名或模块私有配置。
- 可部署、可运营、可品牌化的值必须进入 `internal/config` 和示例配置，不放在常量里。

## 验证命令

```powershell
go test ./types/constants -count=1 -mod=readonly
```
