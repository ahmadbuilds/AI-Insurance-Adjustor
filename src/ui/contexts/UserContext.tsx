"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  username: string;
  email: string;
  role: string;
  profile_image_url: string | null;
}

interface UserContextValue {
  user: UserProfile | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  const fetchUser = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        let { data } = await supabase
          .from("users")
          .select("username, email, role, profile_image_url")
          .eq("id", authUser.id)
          .maybeSingle();

        if (!data) {
          const newProfile = {
            id: authUser.id,
            username:
              authUser.user_metadata?.username ||
              authUser.email?.split("@")[0] ||
              "user",
            email: authUser.email!,
            role:
              authUser.email === "cirsitiano678@gmail.com"
                ? "admin"
                : "claimant",
          };
          const { data: inserted } = await supabase
            .from("users")
            .upsert(newProfile, { onConflict: "id" })
            .select("username, email, role, profile_image_url")
            .single();
          data = inserted;
        }

        if (data) {
          setUser(data);
        }
      } else {
        // No authenticated user — clear cached profile
        setUser(null);
      }
    } catch (err) {
      console.error("Error fetching user:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch once on mount
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchUser();
    }
  }, [fetchUser]);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          fetchUser();
        } else if (event === "SIGNED_OUT") {
          setUser(null);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [fetchUser]);

  // Listen for profile-updated events (from profile settings page)
  useEffect(() => {
    function handleProfileUpdated() {
      fetchUser();
    }

    window.addEventListener("profile-updated", handleProfileUpdated);
    return () =>
      window.removeEventListener("profile-updated", handleProfileUpdated);
  }, [fetchUser]);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser: fetchUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
