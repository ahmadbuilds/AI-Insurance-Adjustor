"use client";

import { useEffect, useState } from "react";
import { deleteUserByAdmin } from "@/app/auth/actions";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ManagedUser {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

export default function ManageUsersPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const router = useRouter();

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const manageableUsers = users.filter((user) => user.id !== currentUserId);
  const filteredUsers = manageableUsers.filter((user) => {
    const matchesQuery =
      !normalizedQuery ||
      user.username.toLowerCase().includes(normalizedQuery) ||
      user.email.toLowerCase().includes(normalizedQuery);
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesQuery && matchesRole;
  });

  async function loadUsers() {
    setUsersLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("users")
      .select("id, username, email, role, created_at")
      .order("created_at", { ascending: false });

    setUsers(data || []);
    setUsersLoading(false);
  }

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile || profile.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      setCurrentUserId(user.id);
      setAuthorized(true);
      setChecking(false);
      await loadUsers();
    }

    checkAdmin();
  }, [router]);

  async function handleDeleteUser(user: ManagedUser) {
    if (
      !confirm(
        `Delete user ${user.username} (${user.email})? This permanently removes their account.`
      )
    ) {
      return;
    }

    setDeletingUserId(user.id);
    setError(null);
    setSuccess(null);

    const result = await deleteUserByAdmin(user.id);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(`User ${user.email} was deleted successfully.`);
      await loadUsers();
    }

    setDeletingUserId(null);
  }

  if (checking || !authorized) {
    return (
      <div className="min-h-screen bg-[#030712]">
        <Navbar />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712]">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-600/8 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-purple-600/8 blur-3xl" />
      </div>

      <Navbar />
      <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-[#0a0e1a] p-8 shadow-2xl shadow-black/50">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white">Manage Users</h1>
            <p className="mt-1 text-sm text-white/50">
              Search, filter, and remove users from the platform.
            </p>
          </div>

          {success && (
            <div className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="user-search"
                className="block text-xs font-semibold uppercase tracking-wide text-white/40"
              >
                Search
              </label>
              <input
                id="user-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username or email"
                className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="role-filter"
                className="block text-xs font-semibold uppercase tracking-wide text-white/40"
              >
                Filter by Role
              </label>
              <select
                id="role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-white/10 bg-[#0f1629] px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="claimant">Claimant</option>
              </select>
            </div>
          </div>

          {usersLoading ? (
            <div className="flex items-center gap-3 text-sm text-white/50">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
              Loading users...
            </div>
          ) : manageableUsers.length === 0 ? (
            <p className="text-sm text-white/50">No users found.</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-sm text-white/50">No users match your search/filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/40">
                      Username
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/40">
                      Email
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/40">
                      Role
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/40">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-3 py-3 text-sm text-white">{user.username}</td>
                      <td className="px-3 py-3 text-sm text-white/60">{user.email}</td>
                      <td className="px-3 py-3 text-sm capitalize">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.role === "admin"
                            ? "bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30"
                            : "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={deletingUserId === user.id}
                          className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                        >
                          {deletingUserId === user.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
