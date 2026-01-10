import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PreviewProvider, useOptionalPreviewContext, usePreviewContext } from './PreviewContext';

describe('PreviewContext', () => {
  describe('PreviewProvider', () => {
    it('should provide context value to children', () => {
      const { result } = renderHook(() => usePreviewContext(), {
        wrapper: PreviewProvider,
      });

      expect(result.current).toBeDefined();
      expect(result.current.registerAction).toBeInstanceOf(Function);
      expect(result.current.scrollToAction).toBeInstanceOf(Function);
      expect(result.current.getActionByUUID).toBeInstanceOf(Function);
    });

    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => usePreviewContext());
      }).toThrow('usePreviewContext must be used within PreviewProvider');

      spy.mockRestore();
    });

    it('should return null when useOptionalPreviewContext used outside provider', () => {
      const { result } = renderHook(() => useOptionalPreviewContext());
      expect(result.current).toBeNull();
    });
  });

  describe('registerAction', () => {
    it('should store UUID mapping with ref and index', () => {
      const { result } = renderHook(() => usePreviewContext(), {
        wrapper: PreviewProvider,
      });

      const mockRef = { current: document.createElement('div') };
      const uuid = 'test-uuid-123';
      const index = 5;

      result.current.registerAction(uuid, mockRef, index);

      const entry = result.current.getActionByUUID(uuid);
      expect(entry).toBeDefined();
      expect(entry?.ref).toBe(mockRef);
      expect(entry?.index).toBe(index);
    });

    it('should update existing UUID registration', () => {
      const { result } = renderHook(() => usePreviewContext(), {
        wrapper: PreviewProvider,
      });

      const mockRef1 = { current: document.createElement('div') };
      const mockRef2 = { current: document.createElement('div') };
      const uuid = 'test-uuid';

      result.current.registerAction(uuid, mockRef1, 0);
      result.current.registerAction(uuid, mockRef2, 1);

      const entry = result.current.getActionByUUID(uuid);
      expect(entry?.ref).toBe(mockRef2);
      expect(entry?.index).toBe(1);
    });

    it('should handle multiple UUID registrations', () => {
      const { result } = renderHook(() => usePreviewContext(), {
        wrapper: PreviewProvider,
      });

      const uuid1 = 'uuid-1';
      const uuid2 = 'uuid-2';
      const ref1 = { current: document.createElement('div') };
      const ref2 = { current: document.createElement('div') };

      result.current.registerAction(uuid1, ref1, 0);
      result.current.registerAction(uuid2, ref2, 1);

      expect(result.current.getActionByUUID(uuid1)?.index).toBe(0);
      expect(result.current.getActionByUUID(uuid2)?.index).toBe(1);
    });
  });

  describe('getActionByUUID', () => {
    it('should return entry for registered UUID', () => {
      const { result } = renderHook(() => usePreviewContext(), {
        wrapper: PreviewProvider,
      });

      const uuid = 'test-uuid';
      const mockRef = { current: document.createElement('div') };
      result.current.registerAction(uuid, mockRef, 3);

      const entry = result.current.getActionByUUID(uuid);
      expect(entry).toBeDefined();
      expect(entry?.ref).toBe(mockRef);
      expect(entry?.index).toBe(3);
    });

    it('should return undefined for unknown UUID', () => {
      const { result } = renderHook(() => usePreviewContext(), {
        wrapper: PreviewProvider,
      });

      const entry = result.current.getActionByUUID('unknown-uuid');
      expect(entry).toBeUndefined();
    });
  });

  describe('scrollToAction', () => {
    it('should scroll element into view', () => {
      const { result } = renderHook(() => usePreviewContext(), {
        wrapper: PreviewProvider,
      });

      const mockElement = document.createElement('div');
      const mockScrollIntoView = vi.fn();
      mockElement.scrollIntoView = mockScrollIntoView;

      const mockRef = { current: mockElement };
      const uuid = 'test-uuid';

      result.current.registerAction(uuid, mockRef, 0);
      result.current.scrollToAction(uuid);

      expect(mockScrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
      });
    });

    it('should apply highlight animation', () => {
      const { result } = renderHook(() => usePreviewContext(), {
        wrapper: PreviewProvider,
      });

      const mockElement = document.createElement('div');
      const mockRef = { current: mockElement };
      const uuid = 'test-uuid';

      result.current.registerAction(uuid, mockRef, 0);
      result.current.scrollToAction(uuid);

      expect(mockElement.style.boxShadow).toBe('0 0 0 3px var(--chakra-colors-blue-400)');
    });

    it('should remove highlight after 2 seconds', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => usePreviewContext(), {
        wrapper: PreviewProvider,
      });

      const mockElement = document.createElement('div');
      const mockRef = { current: mockElement };
      const uuid = 'test-uuid';

      result.current.registerAction(uuid, mockRef, 0);
      result.current.scrollToAction(uuid);

      expect(mockElement.style.boxShadow).toBe('0 0 0 3px var(--chakra-colors-blue-400)');

      // Fast-forward past the timeout
      await vi.advanceTimersByTimeAsync(2000);

      // Now check if the shadow was removed
      expect(mockElement.style.boxShadow).toBe('none');

      vi.useRealTimers();
    });

    it('should handle missing UUID gracefully', () => {
      const { result } = renderHook(() => usePreviewContext(), {
        wrapper: PreviewProvider,
      });

      expect(() => {
        result.current.scrollToAction('unknown-uuid');
      }).not.toThrow();
    });

    it('should handle null ref gracefully', () => {
      const { result } = renderHook(() => usePreviewContext(), {
        wrapper: PreviewProvider,
      });

      const mockRef = { current: null };
      const uuid = 'test-uuid';

      result.current.registerAction(uuid, mockRef, 0);

      expect(() => {
        result.current.scrollToAction(uuid);
      }).not.toThrow();
    });
  });
});
