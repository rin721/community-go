'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useMotionPolicy } from './motion-policy-context';

type RevealCallback = () => void;
type RevealRegistrar = (element: HTMLElement, reveal: RevealCallback) => () => void;

const revealThreshold = 0.15;
const revealRootMargin = '0px 0px -10% 0px';
const ViewportRevealContext = createContext<RevealRegistrar | null>(null);

export function ViewportRevealProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { resolvedMode, categories } = useMotionPolicy();
  const callbacksRef = useRef(new Map<HTMLElement, RevealCallback>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const revealImmediately = resolvedMode !== 'full' || !categories.reveal;

  useEffect(() => {
    if (revealImmediately || typeof IntersectionObserver === 'undefined') {
      for (const reveal of callbacksRef.current.values()) reveal();
      callbacksRef.current.clear();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          callbacksRef.current.get(element)?.();
          callbacksRef.current.delete(element);
          observer.unobserve(element);
        }
      },
      { rootMargin: revealRootMargin, threshold: revealThreshold },
    );
    observerRef.current = observer;
    for (const element of callbacksRef.current.keys()) observer.observe(element);
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [revealImmediately]);

  const register = useCallback<RevealRegistrar>(
    (element, reveal) => {
      if (revealImmediately || typeof IntersectionObserver === 'undefined') {
        reveal();
        return () => undefined;
      }
      callbacksRef.current.set(element, reveal);
      observerRef.current?.observe(element);
      return () => {
        observerRef.current?.unobserve(element);
        callbacksRef.current.delete(element);
      };
    },
    [revealImmediately],
  );

  return <ViewportRevealContext value={register}>{children}</ViewportRevealContext>;
}

/** ViewportReveal 只用于显式 below-fold Region，并且成功 reveal 后永久保持可见。 */
export function ViewportReveal({ children }: Readonly<{ children: ReactNode }>) {
  const register = useContext(ViewportRevealContext);
  const { resolvedMode, categories } = useMotionPolicy();
  const [revealed, setRevealed] = useState(resolvedMode !== 'full' || !categories.reveal);
  const cleanupRef = useRef<(() => void) | null>(null);

  const setElement = useCallback(
    (element: HTMLDivElement | null) => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      if (!element || revealed) return;
      if (!register) {
        setRevealed(true);
        return;
      }
      cleanupRef.current = register(element, () => setRevealed(true));
    },
    [register, revealed],
  );

  useEffect(() => () => cleanupRef.current?.(), []);

  return (
    <div
      className="admin-viewport-reveal"
      data-motion-recipe="reveal"
      data-reveal={revealed ? 'revealed' : 'pending'}
      ref={setElement}
    >
      {children}
    </div>
  );
}
