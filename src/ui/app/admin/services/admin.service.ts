import { createClient } from "@/lib/supabase/client";

export interface ManagedUser {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

class AdminService {
  private static instance: AdminService;

  private constructor() {}

  public static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }


  public async checkIsAdmin(): Promise<string | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      return null;
    }

    return user.id;
  }


  public async fetchAllUsers(): Promise<ManagedUser[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("users")
      .select("id, username, email, role, created_at")
      .order("created_at", { ascending: false });

    if (error) {
       console.error("Failed to load users:", error);
       return [];
    }
    return data || [];
  }
}

export const adminService = AdminService.getInstance();
export default AdminService;
