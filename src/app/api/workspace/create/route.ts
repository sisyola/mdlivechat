import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Force dynamic
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Get auth token from request
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Create client with user's token to verify identity
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create admin client (service role, bypasses RLS)
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if user already has accounts
    const { data: existingAccounts } = await adminClient
      .from("accounts")
      .select("id")
      .eq("owner_id", user.id);

    if (existingAccounts && existingAccounts.length > 0) {
      return NextResponse.json({
        success: true,
        accounts: existingAccounts,
        message: "Workspace already exists",
      });
    }

    // Get user profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const displayName = profile?.full_name || user.email?.split("@")[0] || "User";
    const slug = `ws-${user.id.replace(/-/g, "").slice(0, 12)}`;

    // Create account using service_role (bypasses RLS)
    const { data: newAccount, error: createError } = await adminClient
      .from("accounts")
      .insert({
        owner_id: user.id,
        company_name: `${displayName}'s Workspace`,
        account_slug: slug,
        status: "active",
      })
      .select()
      .single();

    if (createError) {
      console.error("Failed to create account:", createError);
      return NextResponse.json(
        { error: `Failed to create workspace: ${createError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      account: newAccount,
      message: "Workspace created",
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}