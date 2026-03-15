import { DISPUTE_STATUS_CONFIG, type DisputeStatus } from "../types/admin-disputes.types";

interface DisputeStatusBadgeProps {
  status: DisputeStatus;
  size?: "sm" | "md";
  pulse?: boolean;
}

export function DisputeStatusBadge({
  status,
  size = "sm",
  pulse = false,
}: DisputeStatusBadgeProps) {
  const cfg = DISPUTE_STATUS_CONFIG[status];
  const sizeClasses =
    size === "md" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 capitalize ${sizeClasses} ${cfg.colorClass} ${cfg.bgClass} ${cfg.ringClass}`}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dotClass} ${
          pulse && status === "pending" ? "animate-pulse" : ""
        }`}
      />
      {cfg.label}
    </span>
  );
}
