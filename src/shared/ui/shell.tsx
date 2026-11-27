import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { Avatar } from "./primitives";
import styles from "./shell.module.css";

export function AppShell({ sidebar, topbar, children }: { sidebar: ReactNode; topbar: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.shell}>
      {sidebar}
      <div className={styles.main}>
        {topbar}
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

export function Sidebar({
  context,
  footer,
  children,
}: {
  context?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <aside className={styles.sidebar} aria-label="Navegación principal">
      <div className={styles.brand}>
        <BrandMark />
        <span className={styles.brandText}>
          <span className={styles.brandName}>INDAPO</span>
          <span className={styles.brandSub}>Sistema interno</span>
        </span>
      </div>
      {context}
      <nav className={styles.nav}>{children}</nav>
      {footer && <div className={styles.sidebarFooter}>{footer}</div>}
    </aside>
  );
}

function BrandMark() {
  return (
    <span className={styles.brandMark} aria-hidden>
      I
    </span>
  );
}

export function NavSection({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className={styles.navSection}>
      {label && <span className={styles.navLabel}>{label}</span>}
      {children}
    </div>
  );
}

export function NavItem({
  href,
  icon,
  label,
  count,
  alert,
  active,
  disabled,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  count?: number;
  alert?: boolean;
  active?: boolean;
  disabled?: boolean;
}) {
  const content = (
    <>
      {icon}
      {label}
      {disabled ? (
        <span className={styles.navSoon}>Pronto</span>
      ) : (
        count != null && <span className={cx(styles.navCount, alert && styles.navCountAlert)}>{count}</span>
      )}
    </>
  );

  if (disabled) {
    return (
      <span className={cx(styles.navItem, styles.navItemDisabled)} aria-disabled="true">
        {content}
      </span>
    );
  }

  return (
    <Link href={href} className={styles.navItem} aria-current={active ? "page" : undefined}>
      {content}
    </Link>
  );
}

export function SidebarUser({ name, role, action }: { name: string; role: string; action?: ReactNode }) {
  return (
    <>
      <Avatar name={name} />
      <span className={styles.user}>
        <span className={styles.userName}>{name}</span>
        <span className={styles.userRole}>{role}</span>
      </span>
      {action}
    </>
  );
}

export function Topbar({ start, end }: { start?: ReactNode; end?: ReactNode }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.topbarStart}>
        <span className={styles.mobileBrand}>
          <BrandMark />
          INDAPO
        </span>
        {start}
      </div>
      {end && <div className={styles.topbarEnd}>{end}</div>}
    </header>
  );
}

type Crumb = { label: string; href?: string };

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      <div>
        {breadcrumbs && (
          <nav aria-label="Ruta">
            <ol className={styles.breadcrumbs}>
              {breadcrumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`}>
                  {crumb.href ? (
                    <Link href={crumb.href}>{crumb.label}</Link>
                  ) : (
                    <span aria-current="page">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className={styles.pageHeaderRow}>
          <div>
            <h1 className={styles.pageTitle}>{title}</h1>
            {description && <p className={styles.pageDescription}>{description}</p>}
          </div>
          {actions && <div className={styles.pageActions}>{actions}</div>}
        </div>
      </div>
      {children}
    </header>
  );
}
