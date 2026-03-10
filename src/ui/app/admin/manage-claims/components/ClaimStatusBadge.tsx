import { STATUS_CONFIG, type ClaimStatus } from "../types/admin-claims.types";

interface ClaimStatusBadgeProps {
  status: ClaimStatus;
  size?: "sm" | "md";
  pulse?: boolean;
}

export function ClaimStatusBadge({
  status,
  size = "sm",
  pulse = false,
}: ClaimStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];

  const sizeClasses =
    size === "md"
      ? "px-3 py-1 text-sm"
      : "px-2.5 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 capitalize ${sizeClasses} ${cfg.colorClass} ${cfg.bgClass} ${cfg.ringClass}`}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dotClass} ${
          pulse && status === "under_review" ? "animate-pulse" : ""
        }`}
      />
      {cfg.label}
    </span>
  );
}