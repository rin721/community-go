import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { webuiLocaleRegistry, type WebUILocaleMessages } from "./generated/webui-registry";
import hostMessages from "./i18n/locale/zh-CN.json";

const languageStorageKey = "community-go-webui-language";
const fallbackLanguage = "zh-CN";

type LocaleRegistry = Record<string, Record<string, () => Promise<WebUILocaleMessages>>>;

export async function initializeI18n(): Promise<void> {
  if (i18n.isInitialized) return;
  const resources: Record<string, Record<string, WebUILocaleMessages>> = {};
  const registry = webuiLocaleRegistry as LocaleRegistry;
  for (const [language, namespaces] of Object.entries(registry)) {
    resources[language] ??= {};
    for (const [namespace, loadMessages] of Object.entries(namespaces)) {
      resources[language][namespace] = await loadMessages();
    }
  }
  resources[fallbackLanguage] ??= {};
  resources[fallbackLanguage]["webui.host"] = hostMessages as WebUILocaleMessages;
  const requestedLanguage = (typeof localStorage === "undefined" ? null : localStorage.getItem(languageStorageKey))
    ?? (typeof navigator === "undefined" ? fallbackLanguage : navigator.language);
  const language = resources[requestedLanguage] ? requestedLanguage : fallbackLanguage;
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
  await i18n.changeLanguage(language);
  if (typeof localStorage !== "undefined") localStorage.setItem(languageStorageKey, language);
}

export { i18n };
