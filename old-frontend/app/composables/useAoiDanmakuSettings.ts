import type { MaybeRefOrGetter } from "vue"
import type { AoiDanmakuRuntimeSettings } from "~/utils/aoiDanmaku"
import { normalizeAoiDanmakuSettings } from "~/utils/aoiDanmaku"

export function useAoiDanmakuSettings(
  overrides: MaybeRefOrGetter<Partial<AoiDanmakuRuntimeSettings> | undefined> = {}
) {
  const settings = useAppSettingsStore()

  return computed(() => {
    const runtime = normalizeAoiDanmakuSettings({
      ...settings.effectiveDanmakuRuntimeSettings,
      ...toValue(overrides)
    })

    return {
      ...runtime,
      enabled: settings.danmakuEnabled && runtime.enabled
    }
  })
}
