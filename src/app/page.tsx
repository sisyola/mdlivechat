import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-lg">LiveChat</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2 rounded-lg transition"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-gray-900 hover:text-gray-900 font-medium px-4 py-2"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2 rounded-lg transition"
              >
                Daftar Gratis
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Real-time WebSocket
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 tracking-tight">
            Live chat untuk
            <span className="block bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
              website bisnis lu
            </span>
          </h1>
          <p className="text-xl text-gray-900 mt-6 leading-relaxed">
            Embed widget chat ke website lu dalam 5 menit. Customer bisa langsung
            ngobrol dengan tim lu — real-time, multi-room, 100% gratis.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
            <Link
              href="/register"
              className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-8 py-3.5 rounded-lg transition text-lg shadow-lg shadow-brand-600/20"
            >
              Mulai Gratis →
            </Link>
            <a
              href="#fitur"
              className="bg-white hover:bg-gray-50 text-gray-900 font-medium px-8 py-3.5 rounded-lg transition text-lg border border-gray-900"
            >
              Lihat Fitur
            </a>
          </div>
          <p className="text-sm text-gray-900 mt-4">
            Gratis selamanya • Tanpa kartu kredit • Setup 5 menit
          </p>
        </div>

        <div
          id="fitur"
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-24"
        >
          {[
            {
              icon: "💬",
              title: "Real-time messaging",
              desc: "WebSocket native, instant delivery, ga ada delay",
            },
            {
              icon: "🎨",
              title: "Customizable widget",
              desc: "Ubah warna, posisi, judul chat sesuai brand lu",
            },
            {
              icon: "🔐",
              title: "Auth + Multi-room",
              desc: "Tiap customer punya room sendiri, organized",
            },
            {
              icon: "🚀",
              title: "5 menit setup",
              desc: "Cuma embed 1 script tag, langsung jalan",
            },
            {
              icon: "📱",
              title: "Responsive",
              desc: "Works di desktop & mobile, smooth di semua device",
            },
            {
              icon: "💸",
              title: "100% Gratis",
              desc: "Vercel + Supabase free tier cukup untuk ribuan chat",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-white border border-gray-900 rounded-xl p-6 hover:shadow-md transition"
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-900">{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-24 bg-gray-900 rounded-2xl p-8 sm:p-12 text-white">
          <h2 className="text-3xl font-bold mb-3">Cara pakai</h2>
          <p className="text-gray-900 mb-8">
            Tambahin script ini ke website lu, beres.
          </p>
          <pre className="bg-gray-800 rounded-lg p-4 overflow-x-auto text-sm">
            <code className="text-green-400">{`<script
  src="https://your-domain.com/widget.js"
  data-supabase-url="https://xxx.supabase.co"
  data-supabase-key="your-anon-key"
  defer
></script>`}</code>
          </pre>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-900">
        Built with Next.js + Supabase. Deploy gratis di Vercel.
      </footer>
    </div>
  );
}