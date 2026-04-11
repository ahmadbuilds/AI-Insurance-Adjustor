"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Bell, AlertCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "../lib/supabase/client";

type AdminNotification = {
  id: string;
  claim_id: string;
  message: string;
  failed_task: string;
  is_resolved: boolean;
  created_at: string;
};

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();

  // Initial load
  useEffect(() => {
    const fetchExisting = async () => {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .eq("is_resolved", false)
        .order("created_at", { ascending: false });

      if (data && !error) {
        setNotifications(data);
      }
    };
    fetchExisting();
  }, [supabase]);

  // Socket setup
  useEffect(() => {
    // Determine the FastAPI backend URL using the same NEXT_PUBLIC variable used for login/etc
    // Fallback to localhost:8000 for local dev
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://127.0.0.1:8000";
    
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      console.log("Socket connected for admin notifications", newSocket.id);
    });

    newSocket.on("agent_failure", (data: { claim_id: string; failed_task: string; message: string }) => {
      // Data is: {claim_id, failed_task, message}
      setNotifications((prev) => [
        {
          id: Math.random().toString(), // temporary client ID until reload
          claim_id: data.claim_id,
          message: data.message,
          failed_task: data.failed_task,
          is_resolved: false,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const pendingCount = notifications.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white transition-colors"
      >
        <Bell size={20} />
        {pendingCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {pendingCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/50 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">Agent Fallbacks</h3>
            <span className="text-xs font-medium px-2 py-1 bg-slate-700 rounded-md text-slate-300">
              {pendingCount} Pending
            </span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                All AI agents are running smoothly.
              </div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {notifications.map((notif) => (
                  <li key={notif.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                    <div className="flex gap-3">
                      <div className="mt-0.5 text-red-400">
                        <AlertCircle size={18} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-slate-200">
                          {notif.failed_task.replace(/_/g, " ").toUpperCase()} Failed
                        </p>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-slate-500 pt-1">
                          {new Date(notif.created_at).toLocaleString()}
                        </p>
                        
                        <div className="pt-2">
                          <Link 
                            href={`/admin/manage-claims/${notif.claim_id}`}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
                          >
                            Resolve manually →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
