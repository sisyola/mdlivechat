"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function PendingContent() {
  const searchParams = useSearchParams();
  const step = searchParams.get("step");

  if (step === "confirm-email") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Cek Email Lu
          </h1>
          <p className="text-gray-900 mb-6">
            Kami udah kirim link konfirmasi ke email lu. Klik link-nya dulu buat
            aktivasi akun, baru login.
          </p>
          <Link
            href="/login"
            className="inline-block bg-brand-600 hover:bg-brand-700 text-white font-medium px-6 py-2.5 rounded-lg transition"
          >
            Ke Halaman Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-blue-600 animate-pulse"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Nunggu Persetujuan
        </h1>
        <p className="text-gray-900 mb-6">
          Akun lu udah berhasil dibuat dan lagi nunggu persetujuan dari tim
          kami. Biasanya kurang dari 24 jam di hari kerja.
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-left text-sm text-blue-900 mb-6">
          <p className="font-medium mb-1">ℹ️ Sambil nunggu:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>Cek email lu secara berkala</li>
            <li>Pastiin email dari kami ga masuk spam</li>
            <li>Lu bakal dapet notif setelah akun disetujui</li>
          </ul>
        </div>

        <div className="flex gap-3 justify-center">
          <Link
            href="/login"
            className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-6 py-2.5 rounded-lg transition"
          >
            Coba Login
          </Link>
          <Link
            href="/"
            className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium px-6 py-2.5 rounded-lg transition"
          >
            Ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PendingApprovalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <PendingContent />
    </Suspense>
  );
}