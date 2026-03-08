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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
          <div className="mb-5">
            <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
            <p className="mt-1 text-sm text-gray-600">
              Search, filter, and remove users from the platform.
            </p>
          </div>

          {success && (
            <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-700">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="user-search"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Search
              </label>
              <input
                id="user-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username or email"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label
                htmlFor="role-filter"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Filter by Role
              </label>
              <select
                id="role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="claimant">Claimant</option>
              </select>
            </div>
          </div>

          {usersLoading ? (
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              Loading users...
            </div>
          ) : manageableUsers.length === 0 ? (
            <p className="text-sm text-gray-600">No users found.</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-sm text-gray-600">No users match your search/filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Username
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Email
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Role
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-3 py-3 text-sm text-gray-900">{user.username}</td>
                      <td className="px-3 py-3 text-sm text-gray-700">{user.email}</td>
                      <td className="px-3 py-3 text-sm capitalize text-gray-700">{user.role}</td>
                      <td className="px-3 py-3 text-sm">
                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={deletingUserId === user.id}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
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
