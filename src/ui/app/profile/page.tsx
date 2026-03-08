"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  profile_image_url: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: existingProfile, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      let data = existingProfile;

      if (!data && user) {
        const newProfile = {
          id: user.id,
          username: user.user_metadata?.username || user.email?.split("@")[0] || "user",
          email: user.email!,
          role: "claimant",
        };
        const { data: inserted } = await supabase
          .from("users")
          .upsert(newProfile, { onConflict: "id" })
          .select("*")
          .single();
        data = inserted;
      }

      if (data) {
        setProfile(data);
        setUsername(data.username);
      }
      if (error) {
        console.error("Error fetching profile:", error);
      }
      setLoading(false);
    }

    fetchProfile();
  }, [router]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ username })
      .eq("id", profile.id);

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

    // Show local preview immediately
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    const supabase = createClient();

    // Delete the previous image if one exists
    if (profile.profile_image_url) {
      const oldPath = extractStoragePath(profile.profile_image_url);
      if (oldPath) {
        await supabase.storage.from("users_image").remove([oldPath]);
      }
    }

    // Upload the new image
    const fileExt = file.name.split(".").pop();
    const filePath = `${profile.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("users_image")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setMessage({ type: "error", text: uploadError.message });
      setUploading(false);
      return;
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("users_image").getPublicUrl(filePath);

    // Update the user's profile_image_url
    const { error: updateError } = await supabase
      .from("users")
      .update({ profile_image_url: publicUrl })
      .eq("id", profile.id);

    if (updateError) {
      setMessage({ type: "error", text: updateError.message });
      setImagePreview(null);
    } else {
      // Add cache buster to force browser to load the new image
      const cacheBustedUrl = publicUrl + "?t=" + file.lastModified;
      setProfile({ ...profile, profile_image_url: cacheBustedUrl });
      setImagePreview(null);
      setMessage({
        type: "success",
        text: "Profile image updated successfully!",
      });
      // Notify navbar to refresh
      window.dispatchEvent(new Event("profile-updated"));
    }
    setUploading(false);
  }

  function extractStoragePath(url: string): string | null {
    try {
      const cleanUrl = url.split("?")[0];
      const match = cleanUrl.match(/users_image\/(.+)$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  function getInitial(name: string) {
    return name.charAt(0).toUpperCase();
  }

  if (loading) {
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
        <div className="absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-purple-600/8 blur-3xl" />
      </div>

      <Navbar />
      <main className="relative mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-white">
          Profile Settings
        </h1>

        {message && (
          <div
            className={`mb-6 rounded-lg border p-4 text-sm ${
              message.type === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/20 bg-red-500/10 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Profile Image Section */}
        <div className="mb-6 rounded-xl border border-white/10 bg-[#0a0e1a] p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Profile Photo
          </h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              {imagePreview || profile?.profile_image_url ? (
                <Image
                  src={imagePreview || profile!.profile_image_url!}
                  alt="Profile"
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-white/10"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-3xl font-bold text-white ring-2 ring-white/10">
                  {getInitial(profile?.username || username || "U")}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="profile-image-upload" className="sr-only">
                Upload profile photo
              </label>
              <input
                id="profile-image-upload"
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/jpeg,image/png,image/gif,image/webp"
                aria-label="Upload profile photo"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
              >
                {uploading ? "Uploading..." : "Upload New Photo"}
              </button>
              <p className="mt-2 text-xs text-white/30">
                JPG, PNG, GIF or WebP. Max 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Info Section */}
        <div className="rounded-xl border border-white/10 bg-[#0a0e1a] p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Profile Information
          </h2>
          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-white/70"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/70">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={profile?.email || ""}
                disabled
                aria-label="Email"
                className="mt-1 block w-full rounded-lg border border-white/5 bg-white/3 px-4 py-3 text-white/30 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-white/30">
                Email cannot be changed.
              </p>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-white/70">
                Role
              </label>
              <input
                id="role"
                type="text"
                value={profile?.role || ""}
                disabled
                aria-label="Role"
                className="mt-1 block w-full rounded-lg border border-white/5 bg-white/3 px-4 py-3 text-white/30 capitalize cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
