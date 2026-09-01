// 092 INTERACTION-092-001：宿主与业务源码的交互来源单轨规则。
const nativeTagPattern = /<(?:input|select|textarea|button|details|summary|dialog)\b/;
const rolePattern = /role\s*=\s*["'](?:combobox|listbox|menu(?:item)?|radio(?:group)?|tab(?:list|panel)?|tree(?:item)?)/;

export function checkInteractionSource(source, file) {
  const errors = [];
  if (/from\s+["'](?:@heroui\/react|react-aria-components)["']/.test(source)) errors.push(`${file}: page/Shell source must import interaction controls through @webui/sdk/ui`);
  if (nativeTagPattern.test(source)) errors.push(`${file}: raw interaction tag is forbidden outside the centralized UI layer`);
  if (rolePattern.test(source)) errors.push(`${file}: hand-written interaction role is forbidden outside the centralized UI layer`);
  return errors;
}

export const interactionRuleFixtures = {
  rejectNative: `<button onClick={run}>Run</button>`,
  rejectDirectLibrary: `import { Button } from "@heroui/react";`,
  rejectHandWrittenRole: `<div role="treeitem">Node</div>`,
  allowSemanticLayout: `<form><a href="/docs">Docs</a></form>`,
};
