// Tailwind v4 只负责扫描宿主与业务模块源码；HeroUI v3 的组件样式由
// @heroui/styles 提供，不再加载已退役的 v2 theme plugin。
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "../internal/module/*/binding/webui/web/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [],
};
