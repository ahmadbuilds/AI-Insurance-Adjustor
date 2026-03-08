"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

import { validateTitle, type ImageFile } from "./utils/claim-helpers";
import { ImageRow } from "./components/ImageRow";

export default function ClaimsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages]         = useState<ImageFile[]>([]);
  const [dragOver, setDragOver]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);

  // Touched state for inline validation
  const [touchedTitle, setTouchedTitle] = useState(false);
  const [touchedDescription, setTouchedDescription] = useState(false);

  const titleError   = validateTitle(title);
  const titleMissing = touchedTitle && !title.trim();

  // Word count helper
  const wordCount = description.trim() === "" ? 0 : description.trim().split(/\s+/).length;
  const descriptionError = touchedDescription && description.trim() !== "" && wordCount < 200
    ? `At least 200 words required. (${wordCount}/200)`
    : touchedDescription && !description.trim()
    ? "Description is required."
    : null;
  const descriptionValid = description.trim() !== "" && wordCount >= 200;

  // Presence check for button gating
  const formFilled = title.trim() !== "" && description.trim() !== "" && images.length > 0;
  const formValid  = formFilled && !titleError && descriptionValid;

  // ─── Image handling ──────────────────────────────────────────────────────────

  const addImages = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newImages: ImageFile[] = [];
    const errs: string[] = [];

    for (const file of fileArray) {
      if (images.length + newImages.length >= MAX_IMAGES) {
        errs.push(`Maximum ${MAX_IMAGES} images allowed.`); break;
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        errs.push(`"${file.name}" is not a supported image type.`); continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errs.push(`"${file.name}" exceeds the 10 MB limit.`); continue;
      }
      newImages.push({ file, url: URL.createObjectURL(file), id: crypto.randomUUID() });
    }

    if (errs.length) setError(errs.join(" "));
    if (newImages.length) setImages((prev) => [...prev, ...newImages]);
  }, [images.length]);

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.url);
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addImages(e.dataTransfer.files);
  }, [addImages]);

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!title.trim()) { setError("Please enter a claim title."); return; }
    if (titleError)    { setError(titleError); return; }
    if (!description.trim()) { setError("Please enter a claim description."); return; }
    if (images.length === 0) { setError("Please upload at least one image."); return; }

    setSubmitting(true);

    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError("You must be logged in to submit a claim.");
        setSubmitting(false);
        return;
      }

      const { data: claim, error: claimError } = await supabase
        .from("claims")
        .insert({ user_id: user.id, title: title.trim(), description: description.trim(), status: "pending" })
        .select("id")
        .single();

      if (claimError || !claim) {
        setError(claimError?.message || "Failed to create claim.");
        setSubmitting(false);
        return;
      }

      const imageRecords: {
        claim_id: string; user_id: string; storage_path: string;
        file_name: string; file_size: number; mime_type: string;
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
          claim_id: claim.id, user_id: user.id, storage_path: storagePath,
          file_name: img.file.name, file_size: img.file.size, mime_type: img.file.type,
        });
      }

      const { error: imgInsertError } = await supabase.from("claim_images").insert(imageRecords);
      if (imgInsertError) {
        setError(`Claim created but image records failed: ${imgInsertError.message}`);
        setSubmitting(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000";
        await fetch(`${backendUrl}/publish_event?event_channel=claim_evaluation_${claim.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ claim_id: claim.id, user_id: user.id, action: "start_evaluation" }),
        });
      }

      setSuccess("Claim submitted successfully! Your claim is now pending AI evaluation.");
      setTitle("");
      setDescription("");
      setImages([]);
      setTouchedTitle(false);
      setTouchedDescription(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen bg-[#030712] overflow-hidden">
      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-size-[60px_60px]" />
      {/* Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#3B82F6]/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-[#8B5CF6]/8 blur-3xl" />
      </div>

      <Navbar />

      <main className="relative mx-auto max-w-2xl px-6 py-12">

        {/* Back + header */}
        <div className="mb-10">
          <div className="mb-8">
            <button
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
          </div>
          <div className="mb-5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/50">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse inline-block" />
              New Claim
            </span>
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Submit a Claim</h1>
          <p className="mt-2 text-white/40 text-sm">
            Upload evidence and describe your claim. Our AI agents will evaluate it automatically.
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <svg className="h-4 w-4 shrink-0 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-300 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400/50 hover:text-red-300 transition-colors" title="Dismiss error">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <svg className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-emerald-300 flex-1">{success}</p>
            <button onClick={() => setSuccess(null)} className="text-emerald-400/50 hover:text-emerald-300 transition-colors" title="Dismiss success">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Card shell (matches mockup window chrome) ── */}
        <div className="rounded-2xl border border-white/10 bg-linear-to-br from-white/5 to-white/2 overflow-hidden shadow-2xl shadow-black/40">

          <div className="p-6 space-y-6">

            {/* ── Claim Title ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-white/60">Claim Title</label>
                <span className="text-xs text-white/25">{title.length}/200</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  // Strip digits and non-allowed characters on the fly
                  setTitle(e.target.value);
                }}
                onBlur={() => setTouchedTitle(true)}
                placeholder="e.g. Water damage in kitchen"
                maxLength={200}
                className={`w-full rounded-lg border bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:ring-2 transition-all ${
                  touchedTitle && (titleMissing || titleError)
                    ? "border-red-500/50 focus:border-red-500/60 focus:ring-red-500/20"
                    : touchedTitle && title.trim() && !titleError
                    ? "border-emerald-500/40 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    : "border-white/10 focus:border-[#3B82F6]/50 focus:ring-[#3B82F6]/20"
                }`}
              />
              {touchedTitle && titleMissing && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
                  <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Claim title is required.
                </p>
              )}
              {touchedTitle && !titleMissing && titleError && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
                  <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {titleError}
                </p>
              )}
              {!touchedTitle && (
                <p className="mt-1.5 text-xs text-white/25">Letters and punctuation only — no numbers or special characters.</p>
              )}
            </div>

            {/* ── Description ── */}
            <div>
              <label className="block text-sm text-white/60 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => setTouchedDescription(true)}
                placeholder="Describe the incident in detail — what happened, when, the extent of damage, etc."
                rows={5}
                className={`w-full rounded-lg border bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:ring-2 transition-all resize-none ${
                  descriptionError
                    ? "border-red-500/50 focus:border-red-500/60 focus:ring-red-500/20"
                    : touchedDescription && descriptionValid
                    ? "border-emerald-500/40 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    : "border-white/10 focus:border-[#3B82F6]/50 focus:ring-[#3B82F6]/20"
                }`}
              />
              <div className="mt-1 flex items-center">
                {descriptionError ? (
                  <p className="flex items-center gap-1.5 text-xs text-red-400">
                    <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {descriptionError}
                  </p>
                ) : (
                  <p className={`text-xs transition-colors ${
                    wordCount >= 200 ? "text-emerald-400" : wordCount > 0 ? "text-white/40" : "text-white/25"
                  }`}>
                    {wordCount >= 200 ? "✓ Minimum reached" : `${wordCount}/200 words minimum`}
                  </p>
                )}
              </div>
            </div>

            {/* ── Image Upload ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-white/60">Claim Images</label>
                <span className="text-xs text-white/25">{images.length}/{MAX_IMAGES}</span>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                  dragOver
                    ? "border-[#3B82F6]/60 bg-[#3B82F6]/5"
                    : "border-white/10 bg-white/2 hover:border-[#3B82F6]/30 hover:bg-[#3B82F6]/3"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES.join(",")}
                  multiple
                  title="Upload claim images"
                  onChange={(e) => { if (e.target.files) addImages(e.target.files); e.target.value = ""; }}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B82F6]/15 ring-1 ring-[#3B82F6]/25">
                    <svg className="h-5 w-5 text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-white/50">
                      <span className="text-[#3B82F6] font-medium">Click to upload</span> or drag & drop
                    </p>
                    <p className="mt-0.5 text-xs text-white/25">JPEG, PNG, GIF, WebP · max 10 MB each</p>
                  </div>
                </div>
              </div>

              {/* Image rows — compact list style matching the mockup */}
              {images.length > 0 && (
                <div className="mt-3 space-y-2">
                  {images.map((img) => (
                    <ImageRow key={img.id} img={img} onRemove={() => removeImage(img.id)} />
                  ))}
                </div>
              )}
            </div>

            {/* ── Submit ── */}
            <div className="pt-2 border-t border-white/5">
              <button
                onClick={handleSubmit}
                disabled={submitting || !formValid}
                title={!formFilled ? "Please fill in all fields and upload at least one image" : undefined}
                className={`relative w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-all
                  ${formValid && !submitting
                    ? "bg-linear-to-r from-[#3B82F6] to-[#6366F1] shadow-[#3B82F6]/20 hover:shadow-[#3B82F6]/30 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    : "bg-linear-to-r from-[#3B82F6] to-[#6366F1] opacity-40 cursor-not-allowed"
                  }`}
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

              {/* Contextual hint under the button */}
              <p className="mt-2.5 text-center text-sm text-white">
                {!title.trim()
                  ? "Title is required before submitting."
                  : !description.trim()
                  ? "Description is required before submitting."
                  : !descriptionValid
                  ? `Description needs ${200 - wordCount} more word${200 - wordCount === 1 ? "" : "s"}.`
                  : images.length === 0
                  ? "At least one image is required before submitting."
                  : "Your claim will be saved and evaluated by our AI agents."}
              </p>
            </div>

          </div>
        </div>
      </main>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-[#030712] to-transparent" />
    </div>
  );
}