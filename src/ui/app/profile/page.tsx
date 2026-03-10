"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

// Types
interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  profile_image_url: string | null;
}


const USERNAME_MAX = 15;

function validateUsername(v: string): string[] {
  const errors: string[] = [];
  if (!v) return errors;
  if (!/^[a-zA-Z]/.test(v))            errors.push("Must start with a letter (a–z or A–Z)");
  if (!/^[a-zA-Z0-9_]+$/.test(v))      errors.push("Only letters, numbers, and underscores ( _ ) allowed");
  if (v.length > USERNAME_MAX)          errors.push(`Maximum ${USERNAME_MAX} characters`);
  return errors;
}

function FieldErrors({ messages }: { messages: string[] }) {
  if (!messages.length) return null;
  return (
    <ul className="mt-2 space-y-1">
      {messages.map((m) => (
        <li key={m} className="flex items-center gap-2 text-xs text-red-400">
          <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          {m}
        </li>
      ))}
    </ul>
  );
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function inputCls(value: string, hasErrors: boolean, touched: boolean) {
  const base =
    "w-full rounded-lg border bg-white/5 px-4 py-2.5 text-white focus:outline-none focus:ring-2 transition-colors pr-10";
  if (!touched || !value)
    return `${base} border-white/10 focus:border-[#3B82F6]/50 focus:ring-[#3B82F6]/20`;
  if (hasErrors)
    return `${base} border-red-500/50 focus:border-red-500/60 focus:ring-red-500/20`;
  return `${base} border-emerald-500/40 focus:border-emerald-500/50 focus:ring-emerald-500/20`;
}

export default function ProfilePage() {
  const [profile, setProfile]         = useState<UserProfile | null>(null);
  const [username, setUsername]       = useState("");
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [message, setMessage]         = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Validation state
  const [touchedUsername, setTouchedUsername] = useState(false);
  const usernameErrors = validateUsername(username);
  const usernameValid  = username.length > 0 && usernameErrors.length === 0;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) { router.push("/login"); return; }

      const { data: existingProfile, error } = await supabase
        .from("users").select("*").eq("id", user.id).maybeSingle();

      let data = existingProfile;

      if (!data && user) {
        const newProfile = {
          id: user.id,
          username: user.user_metadata?.username || user.email?.split("@")[0] || "user",
          email: user.email!,
          role: "claimant",
        };
        const { data: inserted } = await supabase
          .from("users").upsert(newProfile, { onConflict: "id" }).select("*").single();
        data = inserted;
      }

      if (data) { setProfile(data); setUsername(data.username); }
      if (error) console.error("Error fetching profile:", error);
      setLoading(false);
    }
    fetchProfile();
  }, [router]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    // Touch field to surface errors
    setTouchedUsername(true);
    if (!usernameValid) return;

    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.from("users").update({ username }).eq("id", profile.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Profile updated successfully!" });
      setProfile({ ...profile, username });
      window.dispatchEvent(new Event("profile-updated"));
    }
    setSaving(false);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: "error", text: "Please upload a valid image file (JPEG, PNG, GIF, or WebP)." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be less than 5MB." });
      return;
    }

    setUploading(true);
    setMessage(null);
    setImagePreview(URL.createObjectURL(file));

    const supabase = createClient();

    if (profile.profile_image_url) {
      const oldPath = extractStoragePath(profile.profile_image_url);
      if (oldPath) await supabase.storage.from("users_image").remove([oldPath]);
    }

    const fileExt = file.name.split(".").pop();
    const filePath = `${profile.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("users_image").upload(filePath, file, { upsert: true });

    if (uploadError) {
      setMessage({ type: "error", text: uploadError.message });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("users_image").getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("users").update({ profile_image_url: publicUrl }).eq("id", profile.id);

    if (updateError) {
      setMessage({ type: "error", text: updateError.message });
      setImagePreview(null);
    } else {
      const cacheBustedUrl = publicUrl + "?t=" + file.lastModified;
      setProfile({ ...profile, profile_image_url: cacheBustedUrl });
      setImagePreview(null);
      setMessage({ type: "success", text: "Profile image updated successfully!" });
      window.dispatchEvent(new Event("profile-updated"));
    }
    setUploading(false);
  }

  function extractStoragePath(url: string): string | null {
    try {
      const cleanUrl = url.split("?")[0];
      const match = cleanUrl.match(/users_image\/(.+)$/);
      return match ? match[1] : null;
    } catch { return null; }
  }

  function getInitial(name: string) { return name.charAt(0).toUpperCase(); }

  if (loading) {
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
      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:60px_60px]" />
      {/* Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#3B82F6]/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-[#8B5CF6]/8 blur-3xl" />
      </div>

      <Navbar />

      <main className="relative mx-auto max-w-2xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/50 mb-5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
            Account Settings
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Profile settings</h1>
          <p className="mt-2 text-sm text-white/40">Manage your personal details and avatar.</p>
        </div>

        {/* Alert */}
        {message && (
          <div className={`mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm ${
            message.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/20 bg-red-500/10 text-red-400"
          }`}>
            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {message.type === "success"
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              }
            </svg>
            {message.text}
          </div>
        )}

        {/* Avatar card */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 shadow-lg">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-white/40">Profile Photo</h2>
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              {imagePreview || profile?.profile_image_url ? (
                <Image
                  src={imagePreview || profile!.profile_image_url!}
                  alt="Profile"
                  width={80} height={80}
                  className="h-20 w-20 rounded-full object-cover ring-1 ring-white/10"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-2xl font-semibold text-white ring-1 ring-white/10">
                  {getInitial(profile?.username || username || "U")}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </div>
              )}
            </div>
            <div>
              <label htmlFor="profile-image-upload" className="sr-only">Upload profile photo</label>
              <input
                id="profile-image-upload" type="file" ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/jpeg,image/png,image/gif,image/webp"
                aria-label="Upload profile photo" className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {uploading ? "Uploading…" : "Upload photo"}
              </button>
              <p className="mt-2 text-xs text-white/30">JPG, PNG, GIF or WebP · Max 5 MB</p>
            </div>
          </div>
        </div>

        {/* Profile info card */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 shadow-lg">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-white/40">Profile Information</h2>
          <form onSubmit={handleUpdateProfile} noValidate className="space-y-5">

            {/* ── Username ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="username" className="text-sm text-white/60">Username</label>
                <span className={`text-xs tabular-nums transition-colors ${
                  username.length > USERNAME_MAX
                    ? "text-red-400"
                    : username.length >= USERNAME_MAX - 3
                    ? "text-yellow-400"
                    : "text-white/30"
                }`}>
                  {username.length}/{USERNAME_MAX}
                </span>
              </div>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onBlur={() => setTouchedUsername(true)}
                  required
                  className={inputCls(username, !!usernameErrors.length, touchedUsername)}
                  placeholder="e.g. john_doe"
                />
                {touchedUsername && username && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <StatusIcon ok={!usernameErrors.length} />
                  </span>
                )}
              </div>
              {touchedUsername
                ? <FieldErrors messages={usernameErrors} />
                : <p className="mt-1.5 text-xs text-white/30">Starts with a letter · letters, numbers, underscores · max {USERNAME_MAX} chars</p>
              }
            </div>

            {/* ── Email (read-only) ── */}
            <div>
              <label htmlFor="email" className="block text-sm text-white/60 mb-2">Email</label>
              <input
                id="email" type="email" value={profile?.email || ""} disabled
                aria-label="Email"
                className="w-full rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-2.5 text-white/30 cursor-not-allowed"
              />
              <p className="mt-1.5 text-xs text-white/25">Email cannot be changed.</p>
            </div>

            {/* ── Role (read-only) ── */}
            <div>
              <label htmlFor="role" className="block text-sm text-white/60 mb-2">Role</label>
              <div className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-2.5">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                  profile?.role === "admin"
                    ? "bg-[#8B5CF6]/15 text-[#8B5CF6] ring-1 ring-[#8B5CF6]/25"
                    : "bg-[#3B82F6]/15 text-[#3B82F6] ring-1 ring-[#3B82F6]/25"
                }`}>
                  {profile?.role}
                </span>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </main>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030712] to-transparent" />
    </div>
  );
}