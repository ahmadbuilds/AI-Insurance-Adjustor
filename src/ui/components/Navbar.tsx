"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  username: string;
  email: string;
  role: string;
  profile_image_url: string | null;
}

interface ButtonPosition {
  top: number;
  right: number;
}

function DropdownPortal({
  user,
  pos,
  onClose,
  onSignOut,
}: {
  user: UserProfile | null;
  pos: ButtonPosition;
  onClose: () => void;
  onSignOut: () => void;
}) {
  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-navbar-dropdown]") && !target.closest("[data-navbar-avatar]")) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const content = (
    <div
      data-navbar-dropdown
      className="fixed w-64 rounded-2xl border border-white/10 bg-[#0a0e1a] py-2 shadow-2xl shadow-black/60"
      style={{ top: pos.top, right: pos.right, zIndex: 99999 }}
    >
      {/* User info */}
      <div className="border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-3">
          {user?.profile_image_url ? (
            <img
              src={user.profile_image_url}
              alt="Profile"
              className="h-9 w-9 rounded-full object-cover ring-1 ring-white/20"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-sm font-semibold text-white ring-1 ring-white/20">
              {user?.username?.charAt(0).toUpperCase() ?? "?"}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user?.username}</p>
            <p className="truncate text-xs text-white/40">{user?.email}</p>
          </div>
        </div>
        <div className="mt-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
            user?.role === "admin"
              ? "bg-[#8B5CF6]/15 text-[#8B5CF6] ring-1 ring-[#8B5CF6]/25"
              : "bg-[#3B82F6]/15 text-[#3B82F6] ring-1 ring-[#3B82F6]/25"
          }`}>
            {user?.role}
          </span>
        </div>
      </div>

      {/* Links */}
      <div className="py-1">
        <Link
          href="/dispute-panel"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Dispute Panel
        </Link>
        <Link
          href="/profile"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Profile Settings
        </Link>

        {user?.role === "admin" && (
          <>
            <Link
              href="/admin/create-user"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Create User
            </Link>
            <Link
              href="/admin/manage-users"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Manage Users
            </Link>
          </>
        )}
      </div>

      {/* Sign out */}
      <div className="border-t border-white/8 pt-1">
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );

  // Portal to body to escape any stacking context
  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

export default function Navbar() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [buttonPos, setButtonPos] = useState<ButtonPosition>({ top: 0, right: 0 });
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchUserData = useRef(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        let { data } = await supabase
          .from("users")
          .select("username, email, role, profile_image_url")
          .eq("id", authUser.id)
          .maybeSingle();

        if (!data) {
          const newProfile = {
            id: authUser.id,
            username: authUser.user_metadata?.username || authUser.email?.split("@")[0] || "user",
            email: authUser.email!,
            role: authUser.email === "cirsitiano678@gmail.com" ? "admin" : "claimant",
          };
          const { data: inserted } = await supabase
            .from("users")
            .upsert(newProfile, { onConflict: "id" })
            .select("username, email, role, profile_image_url")
            .single();
          data = inserted;
        }

        if (data) {
          if (data.profile_image_url) {
            data.profile_image_url = data.profile_image_url.split("?")[0] + "?t=" + Date.now();
          }
          setUser(data);
        }
      }
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  });

  useEffect(() => {
    fetchUserData.current();

    function handleProfileUpdated() {
      fetchUserData.current();
    }

    window.addEventListener("profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("profile-updated", handleProfileUpdated);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const handleAvatarClick = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setDropdownOpen((v) => !v);
  };

  return (
    <>
      <nav className="relative z-40 border-b border-white/8 bg-[#030712]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden">
                  <Image src="/favicon.png" alt="Logo" width={32} height={32} className="object-cover" />
                </div>
                <span className="text-sm font-semibold text-white tracking-tight">Immaculate Aegis</span>
              </Link>
              <div className="hidden sm:flex sm:gap-1">
                <Link
                  href="/dashboard"
                  className="rounded-lg px-3 py-2 text-sm text-white/50 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dispute-panel"
                  className="rounded-lg px-3 py-2 text-sm text-white/50 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Dispute Panel
                </Link>
              </div>
            </div>

            {/* Avatar button */}
            <button
              ref={buttonRef}
              data-navbar-avatar
              onClick={handleAvatarClick}
              className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:ring-offset-2 focus:ring-offset-[#030712]"
            >
              {user?.profile_image_url ? (
                <img
                  src={user.profile_image_url}
                  alt="Profile"
                  className="h-9 w-9 rounded-full object-cover ring-1 ring-white/20"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-sm font-semibold text-white ring-1 ring-white/20">
                  {user ? (
                    user.username.charAt(0).toUpperCase()
                  ) : (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                </div>
              )}
            </button>
          </div>
        </div>
      </nav>

      {mounted && dropdownOpen && (
        <DropdownPortal
          user={user}
          pos={buttonPos}
          onClose={() => setDropdownOpen(false)}
          onSignOut={handleSignOut}
        />
      )}
    </>
  );
}