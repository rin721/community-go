export { useWebUITranslation } from "../../contracts";
// 084 NAV-084-001：跨 namespace 文案解析。模块页面（如 Menus）需要翻译
// 其它模块注册的 titleMessageId 时使用 translateMessage；未加载的 namespace
// 需先 ensureRouteLocale（宿主已加载，按 messageID 前缀惰性加载 locale bundle）。
// translateOptional 供「缺失回落」场景（权限目录描述等）使用。
export { translateMessage, translateOptional, ensureRouteLocale } from "../../i18n";