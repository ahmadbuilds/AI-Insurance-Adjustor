"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ClaimStatusBadge } from "./ClaimStatusBadge";
import type { AdminClaim } from "../types/admin-claims.types";

interface ClaimRowProps {
  claim: AdminClaim;
  index: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function UserAvatar({ user }: { user: AdminClaim["user"] }) {
  if (!user) return null;
  const initial = user.username.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {user.profile_image_url ? (
        <img
          src={user.profile_image_url}
          alt={user.username}
          className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10 shrink-0"
        />
      ) : (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6]/40 to-[#8B5CF6]/40 text-xs font-semibold text-white ring-1 ring-white/10">
          {initial}
        </div>
      )}
      <span className="text-sm text-white/60 truncate">{user.username}</span>
    </div>
  );
}

export function ClaimRow({ claim, index }: ClaimRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/admin/manage-claims/${claim.id}`}
        className="group flex items-center gap-4 rounded-xl border border-white/8 bg-white/[0.02] px-5 py-4 hover:border-white/20 hover:bg-white/[0.05] transition-all duration-200"
      >
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <p className="text-sm font-semibold text-white truncate group-hover:text-white/90 transition-colors">
              {claim.title}
            </p>
            <ClaimStatusBadge status={claim.status} pulse />
          </div>
          {claim.ai_verdict ? (
            <p className="text-xs text-white/35 truncate max-w-lg">
              AI: {claim.ai_verdict}
            </p>
          ) : (
            <p className="text-xs text-white/25 italic">No AI verdict yet</p>
          )}
        </div>

        
        <div className="hidden md:flex w-44 shrink-0">
          <UserAvatar user={claim.user} />
        </div>

        
        <div className="hidden sm:block w-28 shrink-0 text-right">
          <span className="text-xs text-white/30">{formatDate(claim.created_at)}</span>
        </div>

        
        <svg
          className="h-4 w-4 shrink-0 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all duration-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </motion.div>
  );
}