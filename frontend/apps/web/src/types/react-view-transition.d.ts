// @types/react 稳定版尚未声明 ViewTransition；Next.js 16 内置 react 运行时已导出该组件。
// 通过 react/canary 的类型导出激活其模块增强：type-only import 不产生运行时代码，
// 满足 verbatimModuleSyntax 且不会在运行时解析不存在的 'react/canary' 模块。
import type {} from 'react/canary';
