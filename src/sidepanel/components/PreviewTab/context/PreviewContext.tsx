import React, { createContext, type ReactNode, useCallback, useContext, useRef } from 'react';
import type { PreviewContextValue } from '../types';

interface UUIDMapEntry {
  ref: React.RefObject<HTMLDivElement>;
  index: number;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);

interface PreviewProviderProps {
  children: ReactNode;
}

export function PreviewProvider({ children }: PreviewProviderProps) {
  const uuidMapRef = useRef<Map<string, UUIDMapEntry>>(new Map());

  const registerAction = useCallback(
    (uuid: string, ref: React.RefObject<HTMLDivElement>, index: number) => {
      if (uuid) {
        uuidMapRef.current.set(uuid, { ref, index });
      }
    },
    [],
  );

  const scrollToAction = useCallback((uuid: string) => {
    const entry = uuidMapRef.current.get(uuid);
    if (entry?.ref.current) {
      entry.ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      // Add highlight animation
      entry.ref.current.style.transition = 'box-shadow 0.3s ease-in-out';
      entry.ref.current.style.boxShadow = '0 0 0 3px var(--chakra-colors-blue-400)';

      setTimeout(() => {
        if (entry.ref.current) {
          entry.ref.current.style.boxShadow = 'none';
        }
      }, 2000);
    }
  }, []);

  const getActionByUUID = useCallback((uuid: string) => {
    return uuidMapRef.current.get(uuid);
  }, []);

  return (
    <PreviewContext.Provider value={{ registerAction, scrollToAction, getActionByUUID }}>
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreviewContext(): PreviewContextValue {
  const context = useContext(PreviewContext);
  if (!context) {
    throw new Error('usePreviewContext must be used within PreviewProvider');
  }
  return context;
}

export function useOptionalPreviewContext(): PreviewContextValue | null {
  return useContext(PreviewContext);
}
