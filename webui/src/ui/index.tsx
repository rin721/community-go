import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import type { CapabilityState } from "@webui/contracts";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow && <p className="page-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{actions && <div className="page-actions">{actions}</div>}</header>;
}

export function Surface({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`surface ${className}`.trim()} {...props} />;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button className={`ui-button ui-button-${variant} ${className}`.trim()} {...props} />;
}

export function Field({ label, hint, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  return <label className="form-field"><span>{label}</span><input className={error ? "field-input field-error" : "field-input"} {...props} />{hint && <small>{hint}</small>}{error && <small className="field-error-message">{error}</small>}</label>;
}

export function StatusPill({ state, children }: { state: CapabilityState; children: ReactNode }) {
  return <span className={`status-pill status-${state}`}><span className="status-dot" />{children}</span>;
}

export function CapabilityBanner({ state, statusLabel, title, detail }: { state: CapabilityState; statusLabel: string; title: string; detail?: string }) {
  return <div className={`capability-banner capability-${state}`}><div><StatusPill state={state}>{statusLabel}</StatusPill><strong>{title}</strong></div>{detail && <p>{detail}</p>}</div>;
}

export function Skeleton({ lines = 3, label }: { lines?: number; label: string }) {
  return <div className="skeleton-stack" aria-label={label}>{Array.from({ length: lines }, (_, index) => <span key={index} />)}</div>;
}
