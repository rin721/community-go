'use client';

import { ViewTransition } from 'react';
import type { ReactNode } from 'react';

import { forwardTransitionClasses } from './page-transition-constants';

export function PageTransition({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ViewTransition default="none" enter={forwardTransitionClasses} exit={forwardTransitionClasses}>
      {children}
    </ViewTransition>
  );
}
