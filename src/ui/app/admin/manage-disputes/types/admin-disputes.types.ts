export type DisputeStatus = "pending" | "approved" | "rejected";

export interface DisputeUser {
  id: string;
  username: string;
  email: string;
  role: string;
  profile_image_url: string | null;
  created_at: string;
}

export interface DisputeClaim {
  id: string;
  title: string;
  description: string;
  status: string;
  ai_verdict: string | null;
}

export interface AdminDispute {
  id: string;
  user_id: string;
  claim_id: string;
  description: string | null;
  evidence: string | null;
  photo_url: string | null;
  status: DisputeStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  user: DisputeUser | null;
  claim: DisputeClaim | null;
}

export interface DisputeFilterState {
  query: string;
  status: DisputeStatus | "all";
}

export interface DisputeUpdatePayload {
  status: DisputeStatus;
  admin_note?: string | null;
}

export interface DisputeStatusConfig {
  label: string;
  colorClass: string;
  bgClass: string;
  ringClass: string;
  dotClass: string;
}

export const DISPUTE_STATUS_CONFIG: Record<DisputeStatus, DisputeStatusConfig> = {
  pending: {
    label: "Pending",
    colorClass: "text-yellow-400",
    bgClass: "bg-yellow-500/10",
    ringClass: "ring-yellow-500/25",
    dotClass: "bg-yellow-400",
  },
  approved: {
    label: "Approved",
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10",
    ringClass: "ring-emerald-500/25",
    dotClass: "bg-emerald-400",
  },
  rejected: {
    label: "Rejected",
    colorClass: "text-red-400",
    bgClass: "bg-red-500/10",
    ringClass: "ring-red-500/25",
    dotClass: "bg-red-400",
  },
};

export const ALL_DISPUTE_STATUSES: Array<DisputeStatus | "all"> = [
  "all",
  "pending",
  "approved",
  "rejected",
];
