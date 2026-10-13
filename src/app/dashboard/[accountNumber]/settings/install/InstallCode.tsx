"use client";

import { useState } from "react";

interface InstallCodeProps {
  accountNumber: string;
  companyName: string;
}

export default function InstallCode({
  accountNumber,
  companyName,
}: InstallCodeProps) {
  const [copied, setCopied] = useState(false);

  const embedCode = `<!-- LiveChat Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${typeof window !== "undefined" ? window.location.origin : ""}/widget-embed.js?account=${accountNumber}';
    script.defer = true;
    document.head.appendChild(script);
  })();
</script>`;

  const directLink = `${typeof window !== "undefined" ? window.location.origin : ""}/${accountNumber}`;

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Install Widget
      </h1>
      <p className="text-gray-900 mb-6">
        Embed widget {companyName} ke website lu
      </p>

      <div className="space-y-6">
        {/* Direct link */}
        <div className="bg-white border border-gray-900 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-2">
            Chat page link
          </h2>
          <p className="text-sm text-gray-900 mb-3">
            Share link ini di email, social media, atau dimana aja
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={directLink}
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-900 rounded-lg text-sm font-mono text-gray-900"
            />
            <button
              onClick={() => copy(directLink)}
              className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Embed code */}
        <div className="bg-white border border-gray-900 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-2">
            Embed code untuk website
          </h2>
          <p className="text-sm text-gray-900 mb-3">
            Paste kode ini sebelum tag{" "}
            <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code> di
            setiap halaman website lu
          </p>
          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
              <code>{embedCode}</code>
            </pre>
            <button
              onClick={() => copy(embedCode)}
              className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs font-medium transition"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Manual setup */}
        <div className="bg-white border border-gray-900 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-2">
            Manual setup
          </h2>
          <ol className="text-sm text-gray-900 space-y-2 list-decimal pl-5">
            <li>Login ke website lu (WordPress, custom, dll)</li>
            <li>
              Buka file HTML atau template yang pengen lu tambahin widget
            </li>
            <li>Paste embed code sebelum tag &lt;/body&gt;</li>
            <li>Save & refresh — widget akan muncul di pojok layar</li>
          </ol>
        </div>
      </div>
    </div>
  );
}