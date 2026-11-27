import { CirclePlus, Search } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cx } from "./cx";
import { Input } from "./forms";
import { Kbd } from "./primitives";
import styles from "./toolbar.module.css";

export function Toolbar({
  bordered,
  label,
  children,
}: {
  bordered?: boolean;
  label?: string;
  children: ReactNode;
}) {
  return (
    <div role="toolbar" aria-label={label} className={cx(styles.toolbar, bordered && styles.bordered)}>
      {children}
    </div>
  );
}

export function ToolbarGroup({ children }: { children: ReactNode }) {
  return <div className={styles.group}>{children}</div>;
}

export function ToolbarSpacer() {
  return <span className={styles.spacer} aria-hidden />;
}

export function SearchInput({
  shortcut,
  className,
  ...props
}: ComponentProps<typeof Input> & { shortcut?: string }) {
  return (
    <Input
      type="search"
      leading={<Search aria-hidden />}
      trailing={shortcut && <Kbd>{shortcut}</Kbd>}
      className={cx(styles.search, className)}
      {...props}
    />
  );
}

type FilterChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  value?: ReactNode;
};

export function FilterChip({ label, value, className, type = "button", ...props }: FilterChipProps) {
  return (
    <button type={type} className={cx(styles.filterChip, value != null && styles.filterChipActive, className)} {...props}>
      {value == null && <CirclePlus aria-hidden />}
      {label}
      {value != null && (
        <>
          <span className={styles.filterDivider} aria-hidden />
          <span className={styles.filterValue}>{value}</span>
        </>
      )}
    </button>
  );
}

type SegmentOption = { value: string; label: ReactNode; count?: number };

export function SegmentedControl({
  name,
  options,
  defaultValue,
  value,
  onValueChange,
  label,
}: {
  name: string;
  options: SegmentOption[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  label?: string;
}) {
  const controlled = value !== undefined;

  return (
    <div role="radiogroup" aria-label={label} className={styles.segmented}>
      {options.map((option) => (
        <label key={option.value} className={styles.segment}>
          <input
            type="radio"
            name={name}
            value={option.value}
            {...(controlled
              ? { checked: option.value === value, onChange: () => onValueChange?.(option.value) }
              : { defaultChecked: option.value === defaultValue })}
          />
          {option.label}
          {option.count != null && <span className={styles.segmentCount}>{option.count}</span>}
        </label>
      ))}
    </div>
  );
}

type TabItem = { href: string; label: ReactNode; count?: number };

export function Tabs({ items, current, label }: { items: TabItem[]; current: string; label?: string }) {
  return (
    <nav aria-label={label} className={styles.tabs}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={styles.tab}
          aria-current={item.href === current ? "page" : undefined}
        >
          {item.label}
          {item.count != null && <span className={styles.tabCount}>{item.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function BulkActionBar({ count, children }: { count: number; children: ReactNode }) {
  return (
    <div className={styles.bulkBar} role="region" aria-label="Acciones en lote">
      <span>
        <span className={styles.bulkCount}>{count}</span> seleccionadas
      </span>
      <div className={styles.bulkActions}>{children}</div>
    </div>
  );
}

export function BulkAction({ className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={cx(styles.bulkAction, className)} {...props} />;
}
