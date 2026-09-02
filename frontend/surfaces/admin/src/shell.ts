/**
 * Admin Surface —— Shell 公共导出。
 *
 * 只导出 Surface 的 taxonomy、Registry→Shell model 转换与 i18n 资源，
 * 不暴露 plugins/* 内部实现；Host 通过 Composition Root 装配。
 */

export {
  adminSurfaceTaxonomy,
  convertRegistryToShellNavigation,
  findTaxonomyEntry,
  type AdminTaxonomyEntry,
} from './shell-model';

export { surfaceShellI18nResources } from './i18n';
export { mergeTranslationResources, type AdminSurfaceComposition } from './composition';
