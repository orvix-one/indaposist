import type { HTMLAttributes, ReactNode } from "react";
import styles from "./card.module.css";
import { cx } from "./cx";

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cx(styles.card, className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      <div>
        <h2 className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}

export function CardBody({ flush, className, ...props }: HTMLAttributes<HTMLDivElement> & { flush?: boolean }) {
  return <div className={cx(styles.body, flush && styles.flush, className)} {...props} />;
}

export function CardFooter({ start, children }: { start?: ReactNode; children?: ReactNode }) {
  return (
    <footer className={cx(styles.footer, start != null && styles.footerStart)}>
      {start && <div>{start}</div>}
      <div className={styles.actions}>{children}</div>
    </footer>
  );
}

export function Stat({
  label,
  value,
  unit,
  icon,
  meta,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>
        {icon}
        {label}
      </span>
      <span className={styles.statValue}>
        {value}
        {unit && <span className={styles.statUnit}>{unit}</span>}
      </span>
      {meta && <span className={styles.statMeta}>{meta}</span>}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className={styles.statGrid}>{children}</div>;
}
