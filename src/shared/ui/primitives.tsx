import type { CSSProperties, ReactNode } from "react";
import { cx } from "./cx";
import styles from "./primitives.module.css";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "solid";

export function Badge({
  tone = "neutral",
  dot,
  square,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  square?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={cx(styles.badge, styles[tone], square && styles.square)}>
      {dot && <span className={styles.dot} aria-hidden />}
      {children}
    </span>
  );
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span className={styles.avatar} style={{ "--avatar-size": `${size}px` } as CSSProperties} title={name} aria-hidden>
      {initials}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className={styles.kbd}>{children}</kbd>;
}

export function Separator({ orientation = "horizontal" }: { orientation?: "horizontal" | "vertical" }) {
  return <hr aria-orientation={orientation} className={cx(styles.separator, styles[orientation])} />;
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className={styles.mono}>{children}</span>;
}

export function Spinner({ label = "Cargando" }: { label?: string }) {
  return <span role="status" aria-label={label} className={styles.spinner} />;
}
