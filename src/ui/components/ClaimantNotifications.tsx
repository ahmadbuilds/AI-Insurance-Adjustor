"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Bell, CheckCircle, XCircle, Activity } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LoadingShield } from "./LoadingShield";

type ClaimantNotification = {
  id: string;
  claim_id: string;
  type: "progress" | "approved" | "rejected";
  message: string;
  is_read: boolean;
  created_at: string;
};

export default function ClaimantNotifications() {
  const [notifications, setNotifications] = useState<ClaimantNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [userClaimIds, setUserClaimIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  // Fetch user's claim IDs and load persisted notifications from DB
  useEffect(() => {
    const fetchClaimsAndNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      // Fetch user's claim IDs
      const { data: claimsData } = await supabase
        .from("claims")
        .select("id")
        .eq("user_id", user.id);

      if (claimsData) {
        setUserClaimIds(new Set(claimsData.map((c) => c.id)));
      }

      // Load persisted notifications from DB
      const { data: notifData, error } = await supabase
        .from("claimant_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (notifData && !error) {
        setNotifications(notifData.map((n: Record<string, unknown>) => ({
          id: n.id as string,
          claim_id: n.claim_id as string,
          type: n.type as "progress" | "approved" | "rejected",
          message: n.message as string,
          is_read: n.is_read as boolean,
          created_at: n.created_at as string,
        })));
      }
    };
    fetchClaimsAndNotifications();
  }, [supabase]);

  useEffect(() => {
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://127.0.0.1:8000";
    
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      console.log("Socket connected for claimant notifications", newSocket.id);
    });

    const addNotification = (type: "progress" | "approved" | "rejected", claim_id: string, message: string) => {
      // Only add if it's the user's claim
      if (!userClaimIds.has(claim_id)) return;

      setNotifications((prev) => {
        const isDuplicate = prev.some(
          (n) => n.claim_id === claim_id && n.type === type && n.message === message
        );
        if (isDuplicate) return prev;

        return [
          {
            id: Math.random().toString(),
            claim_id,
            type,
            message,
            is_read: false,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ];
      });
    };

    newSocket.on("claim_progress", (data: { claim_id: string; message: string }) => {
      addNotification("progress", data.claim_id, data.message);
    });

    newSocket.on("claim_approved", (data: { claim_id: string; message: string }) => {
      addNotification("approved", data.claim_id, data.message);
    });

    newSocket.on("claim_rejected", (data: { claim_id: string; message: string }) => {
      addNotification("rejected", data.claim_id, data.message);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [userClaimIds]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    // Also mark as read in the database
    if (userId) {
      try {
        await supabase
          .from("claimant_notifications")
          .update({ is_read: true })
          .eq("user_id", userId)
          .eq("is_read", false);
      } catch (e) {
        console.error("Failed to mark notifications as read in DB:", e);
      }
    }
  };

  const toggleDropdown = () => {
    if (!isOpen && unreadCount > 0) {
      markAllAsRead();
    }
    setIsOpen(!isOpen);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "approved": return <CheckCircle size={18} className="text-emerald-400 mt-0.5" />;
      case "rejected": return <XCircle size={18} className="text-red-400 mt-0.5" />;
      default: return <LoadingShield className="w-5 h-5 mt-0.5" color="#3B82F6" />; 
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-slate-400 hover:text-white transition-colors"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/50 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">Notifications</h3>
            {notifications.length > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                Mark read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                No recent notifications.
              </div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {notifications.map((notif) => (
                  <li key={notif.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                    <div className="flex gap-3">
                      {getIcon(notif.type)}
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-slate-200 capitalize">
                          Claim {notif.type}
                        </p>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-slate-500 pt-1">
                          {new Date(notif.created_at).toLocaleString()}
                        </p>
                        <div className="pt-2">
                          <Link 
                            href="/claims/track"
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
                          >
                            Track Claim →
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
