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
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">
          Profile Settings
        </h1>

        {message && (
          <div
            className={`mb-6 rounded-lg p-4 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Profile Image Section */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
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
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-gray-200"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-600 text-3xl font-bold text-white ring-2 ring-gray-200">
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
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload New Photo"}
              </button>
              <p className="mt-2 text-xs text-gray-500">
                JPG, PNG, GIF or WebP. Max 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Info Section */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Profile Information
          </h2>
          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={profile?.email || ""}
                disabled
                aria-label="Email"
                className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Email cannot be changed.
              </p>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <input
                id="role"
                type="text"
                value={profile?.role || ""}
                disabled
                aria-label="Role"
                className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500 capitalize"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
