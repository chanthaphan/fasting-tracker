import type { ReactNode } from 'react';

interface PageShellProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

export function PageShell({ title, children, action }: PageShellProps) {
  return (
    <div className="flex-1 overflow-y-auto hide-scrollbar pb-20">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">{title}</h1>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}
