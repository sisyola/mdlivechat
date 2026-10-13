"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Login gagal, coba lagi.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("global_role, full_name")
      .eq("id", data.user.id)
      .single();

    const { data: accounts } = await supabase
      .from("accounts")
      .select("id, status")
      .eq("owner_id", data.user.id);

    const hasActive = accounts?.some((a) => a.status === "active");
    const hasSuspended = accounts?.some((a) => a.status === "suspended");

    if (profile?.global_role === "master_admin") {
      const redirect = searchParams.get("redirect") || "/master";
      router.push(redirect);
      router.refresh();
      setLoading(false);
      return;
    }

    if (!accounts || accounts.length === 0) {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;

        if (!token) throw new Error("No active session");

        const res = await fetch("/api/workspace/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create workspace");
        }

        const redirect = searchParams.get("redirect") || "/dashboard";
        router.push(redirect);
        router.refresh();
        setLoading(false);
        return;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal membuat workspace");
        setLoading(false);
        return;
      }
    }

    if (hasSuspended) {
      setError("Akun lu di-suspend. Hubungi support.");
      setLoading(false);
      await supabase.auth.signOut();
      return;
    }

    const redirect = searchParams.get("redirect") || "/dashboard";
    router.push(redirect);
    router.refresh();
    setLoading(false);
  }

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
