interface PanelProps {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Dashboard card shell: the repeated `card glass-dark border border-subtle` pattern. */
export function Panel({ title, actions, children, className }: PanelProps) {
  return (
    <section className={`card glass-dark border border-subtle ${className ?? ""}`}>
      <div className="card-body gap-3">
        {(title || actions) && (
          <div className="flex items-center justify-between gap-2">
            {title && <h2 className="card-title text-base">{title}</h2>}
            {actions}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
