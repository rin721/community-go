// Package constants 定义跨层共享的稳定运行契约常量。
//
// 边界说明：
// - 应用命令名、默认配置路径、关闭超时和 HTTP API 路径属于公共运行契约。
// - 常量值可能被 cmd、internal、pkg 和文档引用，修改时需要同步测试和文档。
// - 本包不放业务枚举、缓存 key、executor pool 名称、响应结构或可变运行时配置。
package constants
