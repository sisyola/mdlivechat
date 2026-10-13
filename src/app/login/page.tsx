"use client";

import { createClient, clearAuthStorage } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense, useRef } from "react";
import Link from "next/link";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const submittingRef = useRef(false);
  const isNative = typeof window !== "undefined" && Capacitor.isNativePlatform();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);

    // Safety timeout
    const timeoutId = setTimeout(() => {
      if (submittingRef.current) {
        submittingRef.current = false;
        setLoading(false);
        setError("Request timeout. Cek koneksi internet lu.");
      }
    }, 15000);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      console.log("[Login] Direct auth request...");
      const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ email, password }),
      });

      if (!authRes.ok) {
        const errData = await authRes.json().catch(() => ({}));
        console.error("[Login] Auth failed:", errData);
        setError(errData.error_description || errData.msg || "Login gagal. Cek email/password.");
        return;
      }

      const authData = await authRes.json();
      console.log("[Login] Got tokens");

      // Persist session - always to localStorage (persistent in WebView)
      const sessionData = {
        access_token: authData.access_token,
        refresh_token: authData.refresh_token,
        expires_at: authData.expires_at,
        expires_in: authData.expires_in,
        token_type: authData.token_type,
        user: authData.user,
      };

      try {
        localStorage.setItem("mdlivechat-auth-auth-token", JSON.stringify(sessionData));
        localStorage.setItem("mdlivechat-auth-auth-token-code-verifier", authData.refresh_token);
        console.log("[Login] Saved session to localStorage");
      } catch (e) {
        console.error("[Login] localStorage save failed:", e);
      }

      // Also set document.cookie so server-side pages can read session
      // This is critical for Capacitor WebView where server components read cookies
      try {
        const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1];
        if (projectRef) {
          const cookieValue = `sb-${projectRef}-auth-token=${encodeURIComponent(JSON.stringify({
            access_token: authData.access_token,
            refresh_token: authData.refresh_token,
            expires_at: authData.expires_at,
            expires_in: authData.expires_in,
            token_type: authData.token_type,
            user: authData.user,
          }))}`;
          // Set cookie for current path
          document.cookie = `${cookieValue}; path=/; max-age=${authData.expires_in || 3600}; SameSite=Lax`;
          console.log("[Login] Set auth cookie for", projectRef);
        }
      } catch (cookieErr) {
        console.error("[Login] Failed to set cookie:", cookieErr);
      }

      // Determine redirect URL based on user role & accounts
      let redirectPath = "/dashboard";

      try {
        // Use a fresh Supabase client with the tokens
        const supabase = createClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("global_role")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (profile?.global_role === "master_admin") {
          redirectPath = searchParams.get("redirect") || "/master";
        } else {
          const { data: accounts } = await supabase
            .from("accounts")
            .select("id, account_number, status")
            .eq("owner_id", authData.user.id)
            .limit(10);

          const active = accounts?.find((a) => a.status === "active");
          const acc = active || accounts?.[0];
          if (acc) {
            redirectPath = `/dashboard/${acc.account_number || acc.id}/inbox`;
          }
        }
      } catch (ctxErr) {
        console.error("[Login] Context fetch error (will continue):", ctxErr);
        // Fall through with /dashboard
      }

      clearTimeout(timeoutId);

      // Use full URL to avoid WebView path resolution issues
      const fullUrl = window.location.origin + redirectPath;
      console.log("[Login] Navigating to:", fullUrl);
      window.location.replace(fullUrl);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("[Login] Error:", err);
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      clearTimeout(timeoutId);
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Login ke dashboard lu</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-900 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition placeholder-gray-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-900 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition placeholder-gray-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "Login"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Belum punya akun?{" "}
          <Link href="/register" className="text-brand-600 hover:text-brand-700 font-medium">
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
