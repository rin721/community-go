/**
 * Admin Surface —— Shell 公共导出。
 *
 * 只导出 Registry→Shell model 转换、icon vocabulary（受控 semantic presentation
 * metadata）与 i18n 资源，不暴露 plugins/* 内部实现；Host 通过 Composition Root
 * 装配。Group Alias 属 plugins 范围公共 IA（plugins/navigation-groups.ts），
 * 不从这里导出。
 */

export {
  convertRegistryToShellNavigation,
  adminNavigationIconVocabulary,
  UNKNOWN_ADMIN_NAVIGATION_ICON,
  collectUnknownNavigationIconDiagnostics,
  type AdminNavigationIconId,
  type AdminNavigationIconReference,
  type AdminNavigationIconDiagnostic,
} from './shell-model';

export { surfaceShellI18nResources } from './i18n';
export { mergeTranslationResources, type AdminSurfaceComposition } from './composition';
