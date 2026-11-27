import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./button.module.css";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonStyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  className?: string;
};

export function buttonClass({ variant = "secondary", size = "md", iconOnly, className }: ButtonStyleOptions = {}) {
  return cx(styles.button, styles[variant], size !== "md" && styles[size], iconOnly && styles.iconOnly, className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonStyleOptions & {
    loading?: boolean;
    leadingIcon?: ReactNode;
    trailingIcon?: ReactNode;
  };

export function Button({
  variant,
  size,
  iconOnly,
  loading,
  leadingIcon,
  trailingIcon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, iconOnly, className: cx(loading && styles.loading, className) })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
      {loading && <span className={styles.spinner} aria-hidden />}
    </button>
  );
}

export function ButtonGroup({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div role="group" aria-label={label} className={styles.group}>
      {children}
    </div>
  );
}
