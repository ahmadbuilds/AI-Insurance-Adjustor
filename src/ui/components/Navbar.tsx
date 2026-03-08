"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
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

export default function Navbar() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [buttonPos, setButtonPos] = useState<ButtonPosition>({ top: 0, right: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const handleProfileClick = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setDropdownOpen(!dropdownOpen);
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <nav className="border-b border-white/10 bg-[#0a0e1a]/95 backdrop-blur-md shadow-lg shadow-black/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
            >
              AI Insurance Adjuster
            </Link>
            <div className="hidden sm:flex sm:gap-1">
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              ref={buttonRef}
              onClick={handleProfileClick}
              className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0e1a]"
            >
              {user?.profile_image_url ? (
                <img
                  src={user.profile_image_url}
                  alt="Profile"
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-white/20"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-semibold text-white ring-2 ring-white/20">
                  {user ? getInitial(user.username) : (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                </div>
              )}
            </button>

            {dropdownOpen && (
              <div 
                className="fixed z-[10000] w-64 rounded-xl bg-[#0f1629] border border-white/10 py-2 shadow-2xl shadow-black/40"
                style={{
                  top: `${buttonPos.top}px`,
                  right: `${buttonPos.right}px`,
                }}
              >
                <div className="border-b border-white/10 px-4 py-3">
                  <p className="text-sm font-semibold text-white">
                    {user?.username}
                  </p>
                  <p className="text-xs text-white/50">{user?.email}</p>
                  <span className="mt-1 inline-block rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-xs font-medium text-blue-400 capitalize">
                    {user?.role}
                  </span>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Profile Settings
                </Link>
                {user?.role === "admin" && (
                  <>
                    <Link
                      href="/admin/create-user"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      Create User
                    </Link>
                    <Link
                      href="/admin/manage-users"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      Manage Users
                    </Link>
                  </>
                )}
                <button
                  onClick={handleSignOut}
                  className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
