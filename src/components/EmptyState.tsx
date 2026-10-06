import type { ReactNode } from 'react';
import './EmptyState.css';

export function EmptyState({
  icon,
  title,
  description,
  children,
  headingLevel = 2,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
  headingLevel?: 2 | 3;
}) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden="true">
        {icon}
      </span>
      <Heading className="empty-state__title">{title}</Heading>
      <p className="empty-state__description">{description}</p>
      {children && <div className="empty-state__actions">{children}</div>}
    </div>
  );
}
