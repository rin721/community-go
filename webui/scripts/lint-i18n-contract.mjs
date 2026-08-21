import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const webuiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(webuiRoot, "..");
const moduleRoots = [
  join(repositoryRoot, "internal/module/auth/binding/webui/web"),
  join(repositoryRoot, "internal/module/ops/binding/webui/web"),
];
const userProps = /\b(?:aria-label|alt|description|eyebrow|hint|label|placeholder|title)=(["'`])([^"'`\n]+)\1/g;
const userPropExpressions = /\b(?:aria-label|alt|description|eyebrow|hint|label|placeholder|title)=\{(["'`])([^"'`\n]+)\1\}/g;
const textNodes = />\s*([A-Za-z][^<{\n]*)\s*</g;
const errors = [];

async function sourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (/\.(?:ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts") && !entry.name.endsWith(".test.tsx")) files.push(path);
  }
  return files;
}

for (const root of moduleRoots) {
  for (const file of await sourceFiles(root)) {
    const relative = file.slice(repositoryRoot.length + 1).replaceAll("\\", "/");
    const source = await readFile(file, "utf8");
    const isComponent = file.endsWith(".tsx");
    if (/from\s+["']react-i18next["']/.test(source) || /from\s+["'][^"']*\/i18n["']/.test(source)) {
      errors.push(`${relative}: 模块页面不得直接依赖 i18n singleton，必须使用 @webui/contracts 的 useWebUITranslation`);
    }
    if (/setupErrorMessages\b/.test(source)) {
      errors.push(`${relative}: 禁止使用直接返回展示文本的 setupErrorMessages 映射`);
    }
    if (/[\u3400-\u9fff]/u.test(source)) {
      errors.push(`${relative}: 生产模块 Web 源码包含用户可见中文或未审查中文文本`);
    }
    if (isComponent) {
      for (const match of source.matchAll(userProps)) {
        const value = match[2].trim();
        if (value && !value.startsWith("webui.") && value !== "CG") errors.push(`${relative}: 用户文案属性必须使用翻译结果，发现 ${value}`);
      }
      for (const match of source.matchAll(userPropExpressions)) {
        const value = match[2].trim();
        if (value && !value.startsWith("webui.") && value !== "CG") errors.push(`${relative}: 用户文案属性必须使用翻译结果，发现 ${value}`);
      }
      for (const match of source.matchAll(textNodes)) {
        const value = match[1].trim();
        if (/[(){}=/>]/.test(value)) continue;
        if (value && value !== "CG" && !/^[{}$()[\].,;:_/+-]+$/.test(value)) errors.push(`${relative}: JSX 用户文案必须使用翻译结果，发现 ${value}`);
      }
    }
    if (isComponent && !/useWebUITranslation\(/.test(source)) {
      errors.push(`${relative}: 模块页面必须通过 useWebUITranslation 获取文案`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("i18n contract scan passed");
