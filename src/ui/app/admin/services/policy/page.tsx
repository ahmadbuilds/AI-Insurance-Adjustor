"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import * as mammoth from "mammoth";
import Navbar from "@/components/Navbar";

export default function PolicyManagementPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [authorized, setAuthorized] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/dashboard");
        return;
      }
      const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") {
        router.push("/dashboard");
        return;
      }
      setAuthorized(true);
      fetchStatus();
    }
    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchStatus() {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${FASTAPI_URL}/policy_status`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.version || "None");
      }
    } catch (e) {
      console.error(e);
    }
  }

  const extractTextFromDocx = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          resolve(result.value);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".docx")) {
      setMsg({ text: "Only .docx files are supported.", isError: true });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      const text = await extractTextFromDocx(file);

      if (!text || text.trim() === "") {
        setMsg({ text: "Failed to extract text — the document may be empty or corrupted.", isError: true });
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${FASTAPI_URL}/upload_policy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ policy_text: text }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || "Upload failed");

      setMsg({ text: result.message || "Upload successful", isError: false });
      fetchStatus();
    } catch (err: any) {
      setMsg({ text: err.message || "An error occurred", isError: true });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!authorized) return null;

  return (
    <div className="relative min-h-screen bg-[#030712] overflow-hidden">
      <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:60px_60px]" />
      <Navbar />

      <main className="relative mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
          <button onClick={() => router.push("/dashboard")} className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white tracking-tight leading-tight">
            Policy Document Management
          </h1>
          <p className="mt-2 text-sm text-white/50 max-w-xl">
            Upload the canonical insurance policy document to be used by the RAG Assessment Agent. Uploading a new document will update the vector database for future claims.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-white/80 mb-1">Current Active Policy</h2>
              <div className="p-4 rounded-xl border border-white/10 bg-black/20 mt-3">
                <span className="block text-xs text-white/40 mb-1">Version Identifier</span>
                <span className="font-mono text-emerald-400 font-semibold">{status || "Checking..."}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <div className="flex flex-col gap-3">
                {msg && (
                  <div className={`p-3 rounded-lg text-sm border ${msg.isError ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'}`}>
                    {msg.text}
                  </div>
                )}
                <input
                  title="file"
                  type="file"
                  accept=".docx"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#3B82F6] hover:bg-blue-600 active:scale-[0.98] text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                  {loading ? (
                    "Processing..."
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload .docx Policy
                    </>
                  )}
                </button>
                <p className="text-xs text-center text-white/30">Supported format: .docx (Word document)</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
