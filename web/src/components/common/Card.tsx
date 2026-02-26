import { type ReactNode, type MouseEventHandler } from "react";

export interface CardProps {
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement>;
  hoverable?: boolean;
  className?: string;
}

export function Card({
  title,
  subtitle,
  footer,
  children,
  onClick,
  hoverable = false,
  className = "",
}: CardProps) {
  const isClickable = onClick != null || hoverable;

  return (
    <div
      className={[
        "rounded-xl border border-gray-200 bg-white shadow-sm",
        isClickable && "cursor-pointer transition-shadow hover:shadow-md",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
              }
            }
          : undefined
      }
    >
      {(title || subtitle) && (
        <div className="border-b border-gray-100 px-6 py-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      )}

      <div className="px-6 py-4">{children}</div>

      {footer && (
        <div className="border-t border-gray-100 px-6 py-3 bg-gray-50 rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  );
}
