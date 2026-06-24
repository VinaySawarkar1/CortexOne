import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  badge?: { label: string; color?: string };
}

/*
 * Sub-header that sticks to the top of the scroll area.
 * The top header in Layout is OUTSIDE the scroll container, so this
 * uses sticky top-0 (not top-56px) — it sticks to the top of <main>.
 */
export default function PageHeader({
  title,
  subtitle,
  actions,
  className,
  badge,
}: PageHeaderProps) {
  return (
    <div
      data-page-header
      className={cn(
        "sticky top-0 z-20",
        "flex items-center justify-between gap-4 px-6",
        "bg-white border-b border-slate-200",
        className,
      )}
      style={{
        minHeight: 54,
        paddingTop: 10,
        paddingBottom: 10,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      {/* Title + badge + subtitle */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-[15px] font-bold text-slate-900 tracking-tight truncate leading-5">
            {title}
          </h1>
          {badge && (
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0",
                badge.color ?? "bg-indigo-100 text-indigo-700",
              )}
            >
              {badge.label}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] text-slate-400 mt-0.5 truncate leading-4">{subtitle}</p>
        )}
      </div>

      {/* Action buttons */}
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}
