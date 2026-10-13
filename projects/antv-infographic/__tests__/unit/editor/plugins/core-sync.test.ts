import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoreSyncPlugin } from '../../../../src/editor/plugins/core-sync';
import { setSVGPadding } from '../../../../src/utils';

// Mock utils
vi.mock('../../../../src/utils', async () => {
  const actual = await vi.importActual('../../../../src/utils');
  return {
    ...actual,
    setSVGPadding: vi.fn(),
  };
});

describe('CoreSyncPlugin', () => {
  let plugin: CoreSyncPlugin;
  let mockEditor: any;
  let mockSvg: SVGSVGElement;
  let syncHandlers: Record<string, (val: any) => void>;

  beforeEach(() => {
    // Setup mocks
    mockSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    syncHandlers = {};

    mockEditor = {
      getDocument: () => mockSvg,
      registerSync: vi.fn((path, handler) => {
        syncHandlers[path] = handler;
        return vi.fn(); // unregister function
      }),
    };

    plugin = new CoreSyncPlugin();
    plugin.init({ editor: mockEditor } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    plugin.destroy();
  });

  it('should register sync handlers for viewBox and padding', () => {
    expect(mockEditor.registerSync).toHaveBeenCalledWith(
      'viewBox',
      expect.any(Function),
      { immediate: true },
    );
    expect(mockEditor.registerSync).toHaveBeenCalledWith(
      'padding',
      expect.any(Function),
      { immediate: true },
    );
  });

  it('should sync viewBox changes to SVG element', () => {
    const handler = syncHandlers['viewBox'];
    expect(handler).toBeDefined();

    // Test setting viewBox
    handler('0 0 100 100');
    expect(mockSvg.getAttribute('viewBox')).toBe('0 0 100 100');

    // Test removing viewBox
    handler(undefined);
    expect(mockSvg.getAttribute('viewBox')).toBeNull();
  });

  it('should sync padding changes using setSVGPadding utility', () => {
    const handler = syncHandlers['padding'];
    expect(handler).toBeDefined();

    // Test setting padding
    handler(20);
    expect(setSVGPadding).toHaveBeenCalledWith(mockSvg, [20, 20, 20, 20]);

    // Test complex padding
    handler([10, 20]);
    expect(setSVGPadding).toHaveBeenCalledWith(mockSvg, [10, 20, 10, 20]);
  });

  it('should call unregister functions on destroy', () => {
    // Re-initialize to capture mocks
    const unregisterMock = vi.fn();
    mockEditor.registerSync.mockReturnValue(unregisterMock);

    plugin = new CoreSyncPlugin();
    plugin.init({ editor: mockEditor } as any);

    plugin.destroy();
    expect(unregisterMock).toHaveBeenCalledTimes(2); // viewBox + padding
  });
});
