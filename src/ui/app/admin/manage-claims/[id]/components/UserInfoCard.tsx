import type { ClaimUser } from "../../types/admin-claims.types";

interface UserInfoCardProps {
  user: ClaimUser;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export function UserInfoCard({ user }: UserInfoCardProps) {
  const initial = user.username.charAt(0).toUpperCase();

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-white/8">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#3B82F6]/15 ring-1 ring-[#3B82F6]/20">
          <svg className="h-3.5 w-3.5 text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-white/80">Claimant</h2>
      </div>

      <div className="flex items-center gap-4 mb-5">
        {user.profile_image_url ? (
          <img
            src={user.profile_image_url}
            alt={user.username}
            className="h-14 w-14 rounded-full object-cover ring-2 ring-white/10 shrink-0"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-xl font-bold text-white ring-2 ring-white/10">
            {initial}
          </div>
        )}
        <div>
          <p className="text-base font-semibold text-white">{user.username}</p>
          <p className="text-sm text-white/45">{user.email}</p>
        </div>
      </div>

      <div className="space-y-0">
        <div className="flex items-center justify-between py-2.5 border-b border-white/5">
          <span className="text-xs font-medium text-white/45">Role</span>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ${
            user.role === "admin"
              ? "bg-[#8B5CF6]/15 text-[#8B5CF6] ring-[#8B5CF6]/25"
              : "bg-[#3B82F6]/15 text-[#3B82F6] ring-[#3B82F6]/25"
          }`}>
            {user.role}
          </span>
        </div>
        <div className="flex items-center justify-between py-2.5 border-b border-white/5">
          <span className="text-xs font-medium text-white/45">Member since</span>
          <span className="text-xs text-white/65">{formatDate(user.created_at)}</span>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <span className="text-xs font-medium text-white/45">User ID</span>
          <code className="text-xs text-white/40 font-mono truncate max-w-[140px]">
            {user.id.slice(0, 8)}…
          </code>
        </div>
      </div>
    </div>
  );
}