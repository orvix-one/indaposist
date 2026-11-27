"use client";

import { ChevronsUpDown } from "lucide-react";
import styles from "./shell.module.css";

type ContextOption = { value: string; label: string };

export function SidebarContext({
  label,
  value,
  options = [],
  onValueChange,
  placeholder = "—",
}: {
  label: string;
  value: string;
  options?: ContextOption[];
  onValueChange?: (value: string) => void;
  placeholder?: string;
}) {
  const disabled = !onValueChange || options.length === 0;
  const current = options.find((option) => option.value === value)?.label ?? placeholder;
  return (
    <label className={styles.context} data-disabled={disabled || undefined}>
      <span className={styles.contextText}>
        <span className={styles.contextLabel}>{label}</span>
        <span className={styles.contextValue}>{current}</span>
      </span>
      <ChevronsUpDown aria-hidden />
      <select
        className={styles.contextSelect}
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
