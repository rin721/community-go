# Desktop Host

本目录只拥有 Desktop Runtime 专属入口与能力契约。当前阶段尚未选择 Tauri、Electron 或其它 Runtime，因此不伪造可运行窗口，也不把文件系统、系统菜单、快捷键和更新能力下沉到共享 Core。

`DesktopRuntimePort` 是后续 Runtime Adapter 必须满足的窄契约。选型完成后，真实入口、窗口结构与平台生命周期仍留在本目录；共享页面能力通过公共包组合进入。
