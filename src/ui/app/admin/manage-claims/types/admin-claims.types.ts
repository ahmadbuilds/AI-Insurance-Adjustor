

export type ClaimStatus = "pending" | "under_review" | "approved" | "rejected";

export interface ClaimUser {
  id: string;
  username: string;
  email: string;
  role: string;
  profile_image_url: string | null;
  created_at: string;
}

export interface ClaimImage {
  id: string;
  claim_id: string;
  user_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface AdminNotification {
  id: string;
  claim_id: string;
  message: string;
  failed_task: string;
  is_resolved: boolean;
  created_at: string;
}

export interface AdminClaim {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: ClaimStatus;
  ai_verdict: string | null;
  created_at: string;
  updated_at: string;
  
  user: ClaimUser | null;
}

export interface AdminClaimDetail extends AdminClaim {
  images: ClaimImage[];
  active_notification: AdminNotification | null;
}

export interface ClaimFilterState {
  query: string;
  status: ClaimStatus | "all";
}

export interface ClaimUpdatePayload {
  status: ClaimStatus;
  ai_verdict?: string | null;
}



export interface StatusConfig {
  label: string;
  colorClass: string;
  bgClass: string;
  ringClass: string;
  dotClass: string;
}

export const STATUS_CONFIG: Record<ClaimStatus, StatusConfig> = {
  pending: {
    label: "Pending",
    colorClass: "text-yellow-400",
    bgClass: "bg-yellow-500/10",
    ringClass: "ring-yellow-500/25",
    dotClass: "bg-yellow-400",
  },
  under_review: {
    label: "Under Review",
    colorClass: "text-[#3B82F6]",
    bgClass: "bg-[#3B82F6]/10",
    ringClass: "ring-[#3B82F6]/25",
    dotClass: "bg-[#3B82F6]",
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

export const ALL_STATUSES: Array<ClaimStatus | "all"> = [
  "all",
  "approved",
  "under_review",
  "pending",
  "rejected",
];