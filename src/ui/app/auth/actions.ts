"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { sendConfirmationEmail } from "@/lib/email";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Update the users table on successful login (update updated_at)
  if (data.user) {
    await supabase
      .from("users")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.user.id);
  }

  redirect("/dashboard");
}

export async function createUser(formData: FormData) {
  const supabase = await createClient();

  // Verify the current user is an admin
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return { error: "Not authenticated." };
  }

  const { data: adminProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", currentUser.id)
    .single();

  if (!adminProfile || adminProfile.role !== "admin") {
    return { error: "Only admins can create new users." };
  }

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      error:
        "Server is missing Supabase service role configuration. Set SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    };
  }

  const adminSupabase = createSupabaseClient(supabaseUrl, serviceRoleKey);

  const { data: newUser, error: createError } =
    await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { username },
    });

  if (createError) {
    return { error: createError.message };
  }

  // Generate a secure confirmation token
  const token = randomBytes(32).toString("hex");

  // Store the token in the email_confirmations table
  const { error: tokenError } = await adminSupabase
    .from("email_confirmations")
    .insert({
      user_id: newUser.user.id,
      token,
      email,
      confirmed: false,
    });

  if (tokenError) {
    return { error: `User created but failed to generate confirmation link: ${tokenError.message}` };
  }

  // Build the confirmation URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(".supabase.co", "");
  const confirmUrl = `${baseUrl}/api/confirm-account?token=${token}`;

  // Send the custom confirmation email with credentials
  try {
    await sendConfirmationEmail({ to: email, username, password, confirmUrl });
  } catch (emailError: unknown) {
    const msg = emailError instanceof Error ? emailError.message : "Unknown error";
    return {
      error: `User created but failed to send confirmation email: ${msg}. Please check your SMTP settings.`,
    };
  }

  return { success: true };
}

export async function deleteUserByAdmin(userId: string) {
  const supabase = await createClient();

  // Verify the current user is an admin
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return { error: "Not authenticated." };
  }

  if (currentUser.id === userId) {
    return { error: "You cannot delete your own account." };
  }

  const { data: adminProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (!adminProfile || adminProfile.role !== "admin") {
    return { error: "Only admins can delete users." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      error:
        "Server is missing Supabase service role configuration. Set SUPABASE_SERVICE_ROLE_KEY in .env.local and restart the dev server.",
    };
  }

  const adminSupabase = createSupabaseClient(supabaseUrl, serviceRoleKey);

  const cleanupUserImages = async () => {
    const { data: userFiles, error: listError } = await adminSupabase
      .storage
      .from("users_image")
      .list(userId, { limit: 1000, offset: 0 });

    if (listError) {
      return { error: listError.message };
    }

    if (userFiles && userFiles.length > 0) {
      const filePaths = userFiles.map((file) => `${userId}/${file.name}`);
      const { error: removeError } = await adminSupabase
        .storage
        .from("users_image")
        .remove(filePaths);

      if (removeError) {
        return { error: removeError.message };
      }
    }

    return { error: null as string | null };
  };

  const cleanupClaimImages = async () => {
    // List all claim image files under the user's folder in claim_images bucket
    const { data: claimFiles, error: listError } = await adminSupabase
      .storage
      .from("claim_images")
      .list(userId, { limit: 1000, offset: 0 });

    if (listError) {
      return { error: listError.message };
    }

    
    if (claimFiles && claimFiles.length > 0) {
      const allPaths: string[] = [];
      for (const item of claimFiles) {
        if (item.id === null) {
          const { data: subFiles } = await adminSupabase
            .storage
            .from("claim_images")
            .list(`${userId}/${item.name}`, { limit: 1000, offset: 0 });
          if (subFiles) {
            for (const sf of subFiles) {
              allPaths.push(`${userId}/${item.name}/${sf.name}`);
            }
          }
        } else {
          allPaths.push(`${userId}/${item.name}`);
        }
      }

      if (allPaths.length > 0) {
        const { error: removeError } = await adminSupabase
          .storage
          .from("claim_images")
          .remove(allPaths);
        if (removeError) {
          return { error: removeError.message };
        }
      }
    }

    return { error: null as string | null };
  };

  const { error } = await adminSupabase.auth.admin.deleteUser(userId);

  if (!error) {
    const imageCleanup = await cleanupUserImages();
    if (imageCleanup.error) {
      return {
        error: `User deleted, but profile image cleanup failed: ${imageCleanup.error}`,
      };
    }

    const claimImageCleanup = await cleanupClaimImages();
    if (claimImageCleanup.error) {
      return {
        error: `User deleted, but claim image cleanup failed: ${claimImageCleanup.error}`,
      };
    }

    return { success: true };
  }

  if (/database error deleting user/i.test(error.message)) {
    const { error: softDeleteError } = await adminSupabase.auth.admin.deleteUser(
      userId,
      true
    );

    if (softDeleteError) {
      return { error: softDeleteError.message };
    }

    const imageCleanup = await cleanupUserImages();
    if (imageCleanup.error) {
      return {
        error: `User auth was deleted, but profile image cleanup failed: ${imageCleanup.error}`,
      };
    }

    const claimImageCleanup = await cleanupClaimImages();
    if (claimImageCleanup.error) {
      return {
        error: `User auth was deleted, but claim image cleanup failed: ${claimImageCleanup.error}`,
      };
    }

    const { error: profileDeleteError } = await adminSupabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (profileDeleteError) {
      if (
        /direct deletion from storage tables is not allowed/i.test(
          profileDeleteError.message
        )
      ) {
        return {
          error:
            "User auth was deleted, but profile delete is blocked by legacy DB trigger on public.users. Run SQL: DROP TRIGGER IF EXISTS on_user_deleted ON public.users; DROP FUNCTION IF EXISTS public.handle_user_deleted();",
        };
      }

      return {
        error: `User auth was deleted but profile cleanup failed: ${profileDeleteError.message}`,
      };
    }

    return { success: true };
  }

  return { error: error.message };
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
