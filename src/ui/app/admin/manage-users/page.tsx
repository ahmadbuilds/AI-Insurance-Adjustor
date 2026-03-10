"use client";

import { useEffect, useState } from "react";
import { deleteUserByAdmin } from "@/app/auth/actions";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { adminService, type ManagedUser } from "../services/admin.service";

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
    const fetchedUsers = await adminService.fetchAllUsers();
    setUsers(fetchedUsers);
    setUsersLoading(false);
  }

  useEffect(() => {
    async function checkAdmin() {
      const adminId = await adminService.checkIsAdmin();
      
      if (!adminId) {
        router.push("/dashboard");
        return;
      }

      setCurrentUserId(adminId);
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
      <div className="relative min-h-screen bg-[#030712]">
        <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <Navbar />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3B82F6]/30 border-t-[#3B82F6]" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#030712] overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Radial glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#3B82F6]/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-[#8B5CF6]/8 blur-3xl" />
      </div>

      <Navbar />

      <main className="relative mx-auto max-w-5xl px-6 py-12">
        {/* Page header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/50 mb-5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
            Admin · User Management
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">
            Manage users
          </h1>
          <p className="mt-2 text-sm text-white/40">
            Search, filter, and remove users from the platform.
          </p>
        </div>

        {/* Alerts */}
        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Main card */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] shadow-2xl shadow-black/40 overflow-hidden">
          {/* Filters bar */}
          <div className="border-b border-white/10 px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="user-search" className="block text-xs text-white/40 uppercase tracking-widest font-medium mb-2">
                  Search
                </label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    id="user-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by username or email"
                    className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#3B82F6]/50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="role-filter" className="block text-xs text-white/40 uppercase tracking-widest font-medium mb-2">
                  Filter by Role
                </label>
                <select
                  id="role-filter"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0e1a] px-4 py-2.5 text-sm text-white focus:border-[#3B82F6]/50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-colors"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="claimant">Claimant</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table / states */}
          <div className="px-6 py-4">
            {usersLoading ? (
              <div className="flex items-center gap-3 py-8 text-sm text-white/40">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#3B82F6]/30 border-t-[#3B82F6]" />
                Loading users…
              </div>
            ) : manageableUsers.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                  <svg className="h-5 w-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-sm text-white/40">No users found.</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-white/40">No users match your search or filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Result count */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs text-white/30">
                    {filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"} found
                  </span>
                </div>
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-widest text-white/30">
                        User
                      </th>
                      <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-widest text-white/30 hidden sm:table-cell">
                        Email
                      </th>
                      <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-widest text-white/30">
                        Role
                      </th>
                      <th className="pb-3 text-right text-xs font-medium uppercase tracking-widest text-white/30">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6]/30 to-[#8B5CF6]/30 text-xs font-semibold text-white">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-white">{user.username}</span>
                          </div>
                        </td>
                        <td className="py-3.5 pr-4 hidden sm:table-cell">
                          <span className="text-sm text-white/50">{user.email}</span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            user.role === "admin"
                              ? "bg-[#8B5CF6]/15 text-[#8B5CF6] ring-1 ring-[#8B5CF6]/25"
                              : "bg-[#3B82F6]/15 text-[#3B82F6] ring-1 ring-[#3B82F6]/25"
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => handleDeleteUser(user)}
                            disabled={deletingUserId === user.id}
                            className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                          >
                            {deletingUserId === user.id ? "Deleting…" : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030712] to-transparent" />
    </div>
  );
}