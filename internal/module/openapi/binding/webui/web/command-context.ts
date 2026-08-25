import { createContext, createElement, useContext, type ReactNode } from "react";

// OpenAPICommandContext wires the quick-search modal opened from any page of
// the module to the palette state owned by the shared OpenAPILayout: pages only
// receive an openPalette trigger and never manage modal state themselves.
const OpenAPICommandContext = createContext<(() => void) | undefined>(undefined);

// OpenAPICommandProvider injects the palette open trigger into the layout tree.
export function OpenAPICommandProvider({ openPalette, children }: { openPalette: () => void; children: ReactNode }) {
  return createElement(OpenAPICommandContext.Provider, { value: openPalette }, children);
}

// useOpenAPICommand returns the palette open trigger; undefined when the page
// is rendered outside the shared layout (static render / unit tests).
export function useOpenAPICommand(): (() => void) | undefined {
  return useContext(OpenAPICommandContext);
}