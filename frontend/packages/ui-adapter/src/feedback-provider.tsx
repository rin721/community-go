import { Spinner as HeroSpinner } from '@heroui/react/spinner';
import { Toast, type ToastContentValue } from '@heroui/react/toast';
import { useMemo, useState, type ReactNode } from 'react';

import { FeedbackContext, type FeedbackController } from './feedback-context';
import type { FeedbackTone } from './feedback';

const toneVariant: Record<FeedbackTone, ToastContentValue['variant']> = {
  danger: 'danger',
  info: 'accent',
  neutral: 'default',
  success: 'success',
  warning: 'warning',
};

export type FeedbackProviderProps = Readonly<{
  children: ReactNode;
  closeLabel: string;
}>;

export function FeedbackProvider({ children, closeLabel }: FeedbackProviderProps) {
  const [queue] = useState(() => new Toast.Queue<ToastContentValue>({ maxVisibleToasts: 3 }));
  const controller = useMemo<FeedbackController>(
    () => ({
      clear: () => queue.clear(),
      dismiss: (id) => queue.close(id),
      notify: ({
        title,
        description,
        tone = 'neutral',
        action,
        duration = 'transient',
        loading = false,
      }) =>
        queue.add(
          {
            title,
            variant: toneVariant[tone],
            ...(description ? { description } : {}),
            ...(action
              ? {
                  actionProps: {
                    children: action.label,
                    onPress: action.onPress,
                    variant: 'ghost',
                  },
                }
              : {}),
            ...(loading ? { isLoading: true } : {}),
          },
          { timeout: loading || duration === 'persistent' ? 0 : 5_000 },
        ),
    }),
    [queue],
  );

  return (
    <FeedbackContext value={controller}>
      {children}
      <Toast.Provider className="z-toast" maxVisibleToasts={3} placement="bottom end" queue={queue}>
        {({ toast }) => {
          const content = toast.content;
          return (
            <Toast
              className="border-border bg-surface-raised text-ink shadow-overlay"
              toast={toast}
              variant={content.variant}
            >
              {content.isLoading ? (
                <Toast.Indicator variant={content.variant}>
                  <HeroSpinner aria-hidden="true" size="sm" />
                </Toast.Indicator>
              ) : (
                <Toast.Indicator variant={content.variant} />
              )}
              <Toast.Content>
                {content.title ? <Toast.Title>{content.title}</Toast.Title> : null}
                {content.description ? (
                  <Toast.Description>{content.description}</Toast.Description>
                ) : null}
              </Toast.Content>
              {content.actionProps?.children ? (
                <Toast.ActionButton {...content.actionProps} />
              ) : null}
              <Toast.CloseButton aria-label={closeLabel} />
            </Toast>
          );
        }}
      </Toast.Provider>
    </FeedbackContext>
  );
}
