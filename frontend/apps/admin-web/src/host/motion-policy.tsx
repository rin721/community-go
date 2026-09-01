'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

import {
  MotionPolicyContext,
  type MotionCategoryState,
  type MotionMode,
  type MotionPolicyController,
  type MotionPolicyState,
  type MotionScale,
} from './motion-policy-context';

const motionSessionKey = 'community-go.motion-inspector';
const motionMediaQuery = '(prefers-reduced-motion: reduce)';
const inspectorAvailable = process.env.NODE_ENV !== 'production';
const defaultCategories: MotionCategoryState = {
  screen: true,
  async: true,
  reveal: true,
  swap: true,
  feedback: true,
  media: true,
};
const defaultPolicy: MotionPolicyState = {
  mode: 'system',
  scale: 1,
  categories: defaultCategories,
};

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(motionMediaQuery);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function readReducedMotion() {
  return window.matchMedia(motionMediaQuery).matches;
}

function readStoredPolicy(): MotionPolicyState {
  if (!inspectorAvailable || typeof window === 'undefined') return defaultPolicy;
  try {
    const value = window.sessionStorage.getItem(motionSessionKey);
    if (!value) return defaultPolicy;
    const parsed = JSON.parse(value) as Partial<MotionPolicyState>;
    const mode = ['system', 'full', 'reduced', 'off'].includes(parsed.mode ?? '')
      ? (parsed.mode as MotionMode)
      : defaultPolicy.mode;
    const scale = [1, 2, 4].includes(parsed.scale ?? 0)
      ? (parsed.scale as MotionScale)
      : defaultPolicy.scale;
    return {
      mode,
      scale,
      categories: { ...defaultCategories, ...parsed.categories },
    };
  } catch {
    return defaultPolicy;
  }
}

export function MotionPolicyProvider({ children }: Readonly<{ children: ReactNode }>) {
  const systemReduced = useSyncExternalStore(
    subscribeReducedMotion,
    readReducedMotion,
    () => false,
  );
  const [policy, setPolicy] = useState(readStoredPolicy);
  const resolvedMode =
    policy.mode === 'system' ? (systemReduced ? 'reduced' : 'full') : policy.mode;

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.motionMode = inspectorAvailable ? policy.mode : 'system';
    html.style.setProperty('--motion-debug-scale', String(inspectorAvailable ? policy.scale : 1));
    for (const [category, enabled] of Object.entries(policy.categories)) {
      html.dataset[`motion${category[0]?.toUpperCase()}${category.slice(1)}`] = enabled
        ? 'on'
        : 'off';
    }
    if (inspectorAvailable) {
      window.sessionStorage.setItem(motionSessionKey, JSON.stringify(policy));
    }
  }, [policy]);

  const value: MotionPolicyController = {
    ...policy,
    resolvedMode,
    inspectorAvailable,
    setMode: (mode) => setPolicy((current) => ({ ...current, mode })),
    setScale: (scale) => setPolicy((current) => ({ ...current, scale })),
    setCategories: (categories) => setPolicy((current) => ({ ...current, categories })),
  };

  return <MotionPolicyContext value={value}>{children}</MotionPolicyContext>;
}
