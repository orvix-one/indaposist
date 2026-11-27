import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { Button, buttonClass } from "./button";
import { cx } from "./cx";
import styles from "./table.module.css";

type Align = "start" | "center" | "end";

export function Table({ compact, className, ...props }: HTMLAttributes<HTMLTableElement> & { compact?: boolean }) {
  return (
    <div className={styles.wrapper}>
      <table className={cx(styles.table, compact && styles.compact, className)} {...props} />
    </div>
  );
}

export function THead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}

export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cx(styles.tbody, className)} {...props} />;
}

export function Tr({ selected, className, ...props }: HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }) {
  return <tr aria-selected={selected} className={cx(styles.row, className)} {...props} />;
}

type CellOptions = {
  align?: Align;
  numeric?: boolean;
  shrink?: boolean;
  checkbox?: boolean;
};

function cellClass({ align = "start", numeric, shrink, checkbox }: CellOptions) {
  return cx(
    align !== "start" && styles[align],
    numeric && styles.numeric,
    shrink && styles.shrink,
    checkbox && styles.checkCell,
  );
}

type ThProps = Omit<ThHTMLAttributes<HTMLTableCellElement>, "align"> & CellOptions & { sort?: "asc" | "desc" | "none" };

export function Th({ align, numeric, shrink, checkbox, sort, className, children, ...props }: ThProps) {
  const SortIcon = sort === "asc" ? ArrowUp : sort === "desc" ? ArrowDown : ChevronsUpDown;

  return (
    <th
      scope="col"
      aria-sort={sort === "asc" ? "ascending" : sort === "desc" ? "descending" : undefined}
      className={cx(styles.th, cellClass({ align: align ?? (numeric ? "end" : "start"), shrink, checkbox }), className)}
      {...props}
    >
      {sort ? (
        <button type="button" className={styles.sortable}>
          {children}
          <SortIcon aria-hidden />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

type TdProps = Omit<TdHTMLAttributes<HTMLTableCellElement>, "align"> & CellOptions & { muted?: boolean };

export function Td({ align, numeric, shrink, checkbox, muted, className, ...props }: TdProps) {
  return (
    <td
      className={cx(
        styles.td,
        cellClass({ align: align ?? (numeric ? "end" : "start"), numeric, shrink, checkbox }),
        muted && styles.muted,
        className,
      )}
      {...props}
    />
  );
}

export function CellStack({ primary, secondary }: { primary: ReactNode; secondary?: ReactNode }) {
  return (
    <span className={styles.primaryCell}>
      <span className={styles.primaryText}>{primary}</span>
      {secondary && <span className={styles.secondaryText}>{secondary}</span>}
    </span>
  );
}

export function Pagination({
  from,
  to,
  total,
  prevHref,
  nextHref,
  onPrevious,
  onNext,
  children,
}: {
  from: number;
  to: number;
  total: number;
  prevHref?: string;
  nextHref?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  children?: ReactNode;
}) {
  const format = new Intl.NumberFormat("es-BO");

  const pageLink = (href: string | undefined, onClick: (() => void) | undefined, label: string, icon: ReactNode) =>
    href ? (
      <Link href={href} aria-label={label} className={buttonClass({ size: "sm", iconOnly: true })}>
        {icon}
      </Link>
    ) : (
      <Button size="sm" iconOnly aria-label={label} disabled={!onClick} onClick={onClick}>
        {icon}
      </Button>
    );

  return (
    <nav aria-label="Paginación" className={styles.pagination}>
      <span className={styles.paginationRange}>
        <strong>
          {format.format(total === 0 ? 0 : from)}–{format.format(to)}
        </strong>{" "}
        de {format.format(total)}
      </span>
      <div className={styles.paginationControls}>
        {children}
        {pageLink(prevHref, onPrevious, "Página anterior", <ChevronLeft aria-hidden />)}
        {pageLink(nextHref, onNext, "Página siguiente", <ChevronRight aria-hidden />)}
      </div>
    </nav>
  );
}
