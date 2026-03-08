"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

interface ImagePreview {
  file: File;
  url: string;
  id: string;
}

export default function ClaimsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ─── Image handling ──────────────────────────────────────────────────────────

  const addImages = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const newImages: ImagePreview[] = [];
      const errors: string[] = [];

      for (const file of fileArray) {
        if (images.length + newImages.length >= MAX_IMAGES) {
          errors.push(`Maximum ${MAX_IMAGES} images allowed.`);
          break;
        }
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          errors.push(`"${file.name}" is not a supported image type.`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`"${file.name}" exceeds the 10 MB limit.`);
          continue;
        }
        newImages.push({
          file,
          url: URL.createObjectURL(file),
          id: crypto.randomUUID(),
        });
      }

      if (errors.length) setError(errors.join(" "));
      if (newImages.length) setImages((prev) => [...prev, ...newImages]);
    },
    [images.length],
  );

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.url);
      return prev.filter((i) => i.id !== id);
    });
  };

  // ─── Drag & Drop ────────────────────────────────────────────────────────────

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) addImages(e.dataTransfer.files);
    },
    [addImages],
  );

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError("Please enter a claim title.");
      return;
    }
    if (!description.trim()) {
      setError("Please enter a claim description.");
      return;
    }
    if (images.length === 0) {
      setError("Please upload at least one image for your claim.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();

      // 1. Verify user is authenticated
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setError("You must be logged in to submit a claim.");
        setSubmitting(false);
        return;
      }

      // 2. Insert claim record
      const { data: claim, error: claimError } = await supabase
        .from("claims")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          status: "pending",
        })
        .select("id")
        .single();

      if (claimError || !claim) {
        setError(claimError?.message || "Failed to create claim.");
        setSubmitting(false);
        return;
      }

      // 3. Upload images to claim_images storage bucket
      const imageRecords: {
        claim_id: string;
        user_id: string;
        storage_path: string;
        file_name: string;
        file_size: number;
        mime_type: string;
      }[] = [];

      for (const img of images) {
        const ext = img.file.name.split(".").pop() || "jpg";
        const storagePath = `${user.id}/${claim.id}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("claim_images")
          .upload(storagePath, img.file, { contentType: img.file.type });

        if (uploadError) {
          setError(`Failed to upload "${img.file.name}": ${uploadError.message}`);
          setSubmitting(false);
          return;
        }

        imageRecords.push({
          claim_id: claim.id,
          user_id: user.id,
          storage_path: storagePath,
          file_name: img.file.name,
          file_size: img.file.size,
          mime_type: img.file.type,
        });
      }

      // 4. Insert image records into claim_images table
      const { error: imgInsertError } = await supabase
        .from("claim_images")
        .insert(imageRecords);

      if (imgInsertError) {
        setError(`Claim created but image records failed: ${imgInsertError.message}`);
        setSubmitting(false);
        return;
      }

      // 5. Publish event to backend via FastAPI
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

        await fetch(
          `${backendUrl}/publish_event?event_channel=claim_evaluation_${claim.id}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              claim_id: claim.id,
              user_id: user.id,
              action: "start_evaluation",
            }),
          },
        );
      }

      setSuccess("Claim submitted successfully! Your claim is now pending AI evaluation.");
      setTitle("");
      setDescription("");
      setImages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen bg-[#030712] overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Radial glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#3B82F6]/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-[#8B5CF6]/8 blur-3xl" />
      </div>

      <Navbar />

      <main className="relative mx-auto max-w-3xl px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/50 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
            New Claim
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">
            Submit a Claim
          </h1>
          <p className="mt-2 text-white/40 text-sm">
            Upload images and describe your claim. Our AI agents will evaluate it automatically.
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <svg className="h-5 w-5 shrink-0 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-300" title="Dismiss error">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <svg className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-emerald-300">{success}</p>
            <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400/60 hover:text-emerald-300" title="Dismiss">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Form */}
        <div className="space-y-8">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Claim Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Water damage in kitchen"
              maxLength={200}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#3B82F6]/50 focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the incident in detail — what happened, when, the extent of damage, etc."
              rows={5}
              maxLength={5000}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#3B82F6]/50 focus:ring-2 focus:ring-[#3B82F6]/20 transition-all resize-none"
            />
            <p className="mt-1.5 text-xs text-white/25 text-right">{description.length}/5000</p>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Claim Images
              <span className="ml-2 text-xs text-white/30 font-normal">
                ({images.length}/{MAX_IMAGES})
              </span>
            </label>

            {/* Drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                dragOver
                  ? "border-[#3B82F6]/60 bg-[#3B82F6]/5"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                multiple
                title="Upload claim images"
                onChange={(e) => {
                  if (e.target.files) addImages(e.target.files);
                  e.target.value = "";
                }}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#3B82F6]/10 ring-1 ring-[#3B82F6]/25">
                  <svg className="h-6 w-6 text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-white/60">
                    <span className="text-[#3B82F6] font-medium">Click to upload</span>{" "}
                    or drag & drop
                  </p>
                  <p className="mt-1 text-xs text-white/30">
                    JPEG, PNG, GIF, or WebP — max 10 MB each
                  </p>
                </div>
              </div>
            </div>

            {/* Image previews */}
            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5"
                  >
                    <Image
                      src={img.url}
                      alt={img.file.name}
                      fill
                      className="object-cover"
                    />
                    {/* Overlay with file name */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
                      <p className="text-xs text-white/80 truncate">{img.file.name}</p>
                      <p className="text-[10px] text-white/40">
                        {(img.file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                    {/* Remove button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(img.id);
                      }}
                      title="Remove image"
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white/60 opacity-0 group-hover:opacity-100 hover:bg-red-500/80 hover:text-white transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-white/5">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="relative w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#6366F1] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#3B82F6]/20 hover:shadow-[#3B82F6]/30 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting Claim…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Start Evaluation
                </>
              )}
            </button>
            <p className="mt-3 text-center text-xs text-white/30">
              Your claim will be saved and sent to our AI agents for evaluation.
            </p>
          </div>
        </div>
      </main>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030712] to-transparent" />
    </div>
  );
}
