import { heroui } from "@heroui/theme";

// HeroUI 全量采用（068）的 Tailwind v4 legacy 配置：
// - content 覆盖宿主源码与全部业务模块 WebUI 页面（模块页面可能使用 Tailwind 工具类）；
// - darkMode=class 与 theme.ts 的 data-color-scheme/classList 联动；
// - heroui() 插件生成组件样式与设计 token；品牌/预设语义色经 heroui({ themes }) 配置扩展。
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "../internal/module/*/binding/webui/web/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [heroui()],
};