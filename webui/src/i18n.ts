import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { webuiLocaleRegistry, type WebUILocaleMessages } from "./generated/webui-registry";
import type { ManifestRoute } from "@webui/sdk/runtime";
import hostMessages from "./i18n/locale/zh-CN.json";
import hostMessagesEnglish from "./i18n/locale/en-US.json";

const languageStorageKey = "community-go-webui-language";
const fallbackLanguage = "zh-CN";
const hostLocaleMessages: Record<string, WebUILocaleMessages> = { "zh-CN": hostMessages, "en-US": hostMessagesEnglish };
const languageMessageIDs: Record<string, string> = { "zh-CN": "webui.host.language.zhCN", "en-US": "webui.host.language.enUS" };

type LocaleRegistry = Record<string, Record<string, () => Promise<WebUILocaleMessages>>>;
const loadedNamespaces = new Set<string>();

export async function initializeI18n(): Promise<void> {
  if (i18n.isInitialized) return;
  const resources: Record<string, Record<string, WebUILocaleMessages>> = {};
  for (const [language, messages] of Object.entries(hostLocaleMessages)) {
    resources[language] ??= {};
    resources[language]["webui.host"] = messages;
    loadedNamespaces.add(`${language}:webui.host`);
  }
  const requestedLanguage = (typeof localStorage === "undefined" ? null : localStorage.getItem(languageStorageKey))
    ?? (typeof navigator === "undefined" ? fallbackLanguage : navigator.language);
  const language = resolveLanguage(requestedLanguage, resources);
  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: fallbackLanguage,
    defaultNS: "webui.host",
    interpolation: { escapeValue: false },
    keySeparator: false,
    nsSeparator: false,
    returnNull: false,
    parseMissingKeyHandler: () => hostMessages["webui.host.i18n.missing"] ?? "webui_i18n_missing"
  });
}

// ensureRouteLocale 在 route access/availability 通过后才加载模块 namespace。
// 单个 namespace 加载失败由调用方隔离到当前 route，不会阻止宿主 locale 初始化。
export async function ensureRouteLocale(route: ManifestRoute): Promise<void> {
  const namespace = namespaceForMessage(route.titleMessageId);
  if (namespace === "webui.host") return;
  const requestedLanguage = i18n.language || fallbackLanguage;
  const language = Object.prototype.hasOwnProperty.call(hostLocaleMessages, requestedLanguage) ? requestedLanguage : fallbackLanguage;
  const registry = webuiLocaleRegistry as LocaleRegistry;
  const loadMessages = registry[language]?.[namespace] ?? registry[fallbackLanguage]?.[namespace];
  if (!loadMessages) throw new Error("webui_locale_missing");
  const resourceLanguage = registry[language]?.[namespace] ? language : fallbackLanguage;
  const key = `${resourceLanguage}:${namespace}`;
  if (loadedNamespaces.has(key)) return;
  const messages = await loadMessages();
  i18n.addResourceBundle(resourceLanguage, namespace, messages, true, true);
  loadedNamespaces.add(key);
}

function resolveLanguage(requestedLanguage: string | null, resources: Record<string, Record<string, WebUILocaleMessages>>): string {
  if (requestedLanguage && resources[requestedLanguage]) return requestedLanguage;
  const baseLanguage = requestedLanguage?.split("-")[0];
  const regionalMatch = baseLanguage && Object.keys(resources).find((language) => language.split("-")[0] === baseLanguage);
  return regionalMatch ?? fallbackLanguage;
}

export function getAvailableLanguages(): string[] {
  const registry = webuiLocaleRegistry as LocaleRegistry;
  return Object.keys(hostLocaleMessages).filter((language) => language === fallbackLanguage || Object.prototype.hasOwnProperty.call(registry, language)).sort();
}

export function languageLabelMessageID(language: string): string {
  return languageMessageIDs[language] ?? "webui.host.language.unknown";
}

export function namespaceForMessage(messageID: string): string {
  return messageID.split(".").slice(0, 2).join(".");
}

export function translateMessage(messageID: string): string {
  const namespace = namespaceForMessage(messageID);
  const translated = i18n.t(messageID, { ns: namespace });
  return translated === messageID || translated.trim() === ""
    ? hostMessages["webui.host.i18n.missing"]
    : translated;
}

export async function changeLanguage(language: string): Promise<void> {
  if (!getAvailableLanguages().includes(language)) throw new Error("webui_language_unsupported");
  await i18n.changeLanguage(language);
  if (typeof localStorage !== "undefined") localStorage.setItem(languageStorageKey, language);
}

export { i18n };
