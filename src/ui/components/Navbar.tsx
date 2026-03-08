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

export default function Navbar() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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
        !dropdownRef.current.contains(event.target as Node)
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

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="text-xl font-bold text-indigo-600"
            >
              AI Insurance Adjuster
            </Link>
            <div className="hidden sm:flex sm:gap-4">
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                Dashboard
              </Link>
              {user?.role === "admin" && (
                <>
                  <Link
                    href="/admin/create-user"
                    className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  >
                    Create User
                  </Link>
                  <Link
                    href="/admin/manage-users"
                    className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  >
                    Manage Users
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {user?.profile_image_url ? (
                <img
                  src={user.profile_image_url}
                  alt="Profile"
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                  {user ? getInitial(user.username) : (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                </div>
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl bg-white py-2 shadow-lg ring-1 ring-black/5">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {user?.username}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  <span className="mt-1 inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 capitalize">
                    {user?.role}
                  </span>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Profile Settings
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
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
