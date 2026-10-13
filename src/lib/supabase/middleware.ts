import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options: CookieOptions;
          }>
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Get user role if logged in
  let userRole: string | null = null;
  let userAccounts: { id: string; status: string }[] = [];
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("global_role")
      .eq("id", user.id)
      .single();
    userRole = profile?.global_role || null;

    // Get user's accounts and their status
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id, status")
      .eq("owner_id", user.id);
    userAccounts = accounts || [];
  }

  // Public routes that don't need auth
  const publicRoutes = ["/", "/login", "/register", "/pending-approval"];
  const isPublicRoute =
    publicRoutes.includes(pathname) ||
    pathname.startsWith("/widget/") ||
    /^\/\d+$/.test(pathname) || // /{accountNumber}
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/widget.js";

  // Protect /dashboard routes
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    // Check if user has any active account
    const hasActiveAccount = userAccounts.some((a) => a.status === "active");
    if (!hasActiveAccount) {
      const url = request.nextUrl.clone();
      url.pathname = "/pending-approval";
      return NextResponse.redirect(url);
    }
  }

  // Protect /master routes (master_admin only)
  if (pathname.startsWith("/master")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    if (userRole !== "master_admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Redirect logged-in users away from auth pages
  if (
    (pathname === "/login" || pathname === "/register") &&
    user
  ) {
    const url = request.nextUrl.clone();
    url.pathname = userRole === "master_admin" ? "/master" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}