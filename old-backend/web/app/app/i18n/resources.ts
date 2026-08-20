import enUS from "./locales/en-US.json";
import zhCN from "./locales/zh-CN.json";

export const fallbackLanguage = "zh-CN";

export const resources = {
  "zh-CN": zhCN,
  "en-US": enUS,
} as const;

export type AppLocale = keyof typeof resources;
export type AppResource = (typeof resources)[AppLocale];
