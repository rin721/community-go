import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { webuiLocaleRegistry, type WebUILocaleMessages } from "./generated/webui-registry";
import hostMessages from "./i18n/locale/zh-CN.json";
import hostMessagesEnglish from "./i18n/locale/en-US.json";

const languageStorageKey = "community-go-webui-language";
const fallbackLanguage = "zh-CN";
const hostLocaleMessages: Record<string, WebUILocaleMessages> = { "zh-CN": hostMessages, "en-US": hostMessagesEnglish };
const languageMessageIDs: Record<string, string> = { "zh-CN": "webui.host.language.zhCN", "en-US": "webui.host.language.enUS" };

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
  for (const [language, messages] of Object.entries(hostLocaleMessages)) {
    resources[language] ??= {};
    resources[language]["webui.host"] = messages;
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
