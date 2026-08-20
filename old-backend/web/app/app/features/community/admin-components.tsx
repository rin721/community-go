import type { TextareaHTMLAttributes, ReactNode } from "react";
import { useId } from "react";

export type CommunityNotice = {
  description: string;
  intent?: "danger" | "info";
  title: string;
};

type CommunityStatCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

export function CommunityStatCard({ icon, label, value }: CommunityStatCardProps) {
  return (
    <article className="console-admin-stat-card">
      <div className="console-admin-stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

type CommunityTextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
  help?: string;
  label: string;
};

export function CommunityTextAreaField({
  error,
  help,
  id,
  label,
  ...props
}: CommunityTextAreaFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helpId = help ? `${inputId}-help` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="console-form-field">
      <label htmlFor={inputId}>{label}</label>
      <textarea
        id={inputId}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {help ? (
        <span id={helpId} className="console-form-field__help">
          {help}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="console-form-field__error">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function formatCommunityDate(
  value: null | string | undefined,
  locale: string,
  emptyLabel: string,
) {
  if (!value) {
    return emptyLabel;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatCommunityNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

export function normalizeCommunityLimit(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, 100);
}

export function sameCommunityID(a: number | string | undefined, b: number | string | undefined) {
  return a !== undefined && b !== undefined && String(a) === String(b);
}

export function truncateCommunityText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1))}...`;
}
