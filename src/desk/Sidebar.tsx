import type { ReactNode } from "react";

export function SidebarCard({
  title,
  subtitle,
  action,
  accent,
  children,
  className = "",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  accent?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`sidebar-card ${className}`}>
      <header className="sidebar-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <div className="sidebar-subtitle">{subtitle}</div>}
        </div>
        {action}
      </header>
      {accent && (
        <div className="sidebar-accent" style={{ background: accent }} />
      )}
      {children}
    </div>
  );
}
export function SidebarSection({
  title,
  children,
}: {
  title?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="sidebar-section">
      {title && <h3>{title}</h3>}
      {children}
    </section>
  );
}
export function SidebarFacts({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="sidebar-facts">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function SidebarActions({ children }: { children: ReactNode }) {
  return <div className="sidebar-actions">{children}</div>;
}
