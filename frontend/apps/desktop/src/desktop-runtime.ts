export type DesktopWindowCommand = 'minimize' | 'maximize' | 'close';

export type DesktopRuntimePort = Readonly<{
  platform: 'windows' | 'macos' | 'linux';
  window: Readonly<{
    execute: (command: DesktopWindowCommand) => Promise<void>;
  }>;
  shortcuts: Readonly<{
    register: (accelerator: string, actionId: string) => Promise<() => Promise<void>>;
  }>;
  files: Readonly<{
    select: (options: Readonly<{ multiple: boolean }>) => Promise<readonly string[]>;
  }>;
}>;

export type DesktopHost = Readonly<{
  platformLabel: string;
  close: () => Promise<void>;
  selectFiles: (multiple?: boolean) => Promise<readonly string[]>;
}>;

const platformLabel = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
} as const;

// createDesktopHost 只编排 Host 专属能力，不把 Runtime 对象暴露给共享 Feature。
export function createDesktopHost(runtime: DesktopRuntimePort): DesktopHost {
  return {
    platformLabel: platformLabel[runtime.platform],
    close: () => runtime.window.execute('close'),
    selectFiles: (multiple = false) => runtime.files.select({ multiple }),
  };
}
