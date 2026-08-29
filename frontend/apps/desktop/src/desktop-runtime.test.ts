import { describe, expect, it, vi } from 'vitest';

import { createDesktopHost, type DesktopRuntimePort } from './desktop-runtime';

function createRuntime(): DesktopRuntimePort {
  return {
    platform: 'windows',
    window: { execute: vi.fn().mockResolvedValue(undefined) },
    shortcuts: { register: vi.fn() },
    files: {
      select: vi.fn().mockResolvedValue(['D:/workspace/example.txt']),
      saveText: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe('createDesktopHost', () => {
  it('把文件选择差异保留在 Desktop Runtime 边界', async () => {
    const runtime = createRuntime();
    const host = createDesktopHost(runtime);

    await expect(host.selectFiles(true)).resolves.toEqual(['D:/workspace/example.txt']);
    expect(runtime.files.select).toHaveBeenCalledWith({ multiple: true });
  });

  it('用同一个 Reference Port 契约组合 Desktop 文件能力', async () => {
    const runtime = createRuntime();
    const host = createDesktopHost(runtime);

    await host.exportTextFile('snapshot.json', '{"ok":true}');

    expect(runtime.files.saveText).toHaveBeenCalledWith({
      suggestedName: 'snapshot.json',
      content: '{"ok":true}',
    });
  });
});
