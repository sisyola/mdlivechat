"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type {
  AccountSettings,
  WidgetPosition,
  WidgetTheme,
} from "@/lib/types";
import FileUpload from "@/components/FileUpload";

interface Props {
  accountNumber: string;
  settings: AccountSettings;
}

const colorPresets = [
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#1f2937",
  "#0ea5e9",
  "#14b8a6",
];

const gradientPresets = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
];

const positions: { value: WidgetPosition; label: string }[] = [
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "top-right", label: "Top Right" },
  { value: "top-left", label: "Top Left" },
];

const fonts = [
  { value: "system", label: "System Default" },
  { value: "inter", label: "Inter (Modern)" },
  { value: "roboto", label: "Roboto" },
  { value: "poppins", label: "Poppins (Friendly)" },
  { value: "playfair", label: "Playfair (Elegant)" },
];

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-900 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer flex-shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1 border border-gray-900 rounded text-xs font-mono outline-none text-gray-900"
        />
      </div>
    </div>
  );
}

export default function WidgetCustomizer({ accountNumber, settings }: Props) {
  const [pageTitle, setPageTitle] = useState(
    settings.page_title || settings.widget_title || "Chat dengan kami"
  );
  const [pageSubtitle, setPageSubtitle] = useState(
    settings.page_subtitle || settings.welcome_message || ""
  );
  const [headerBg, setHeaderBg] = useState(
    settings.header_bg_color || settings.widget_color || "#3b82f6"
  );
  const [customerBubble, setCustomerBubble] = useState(
    settings.customer_bubble_color || settings.widget_color || "#3b82f6"
  );
  const [agentBubble, setAgentBubble] = useState(
    settings.agent_bubble_color || "#f3f4f6"
  );
  const [pageBgType, setPageBgType] = useState<"color" | "gradient" | "image">(
    settings.page_bg_type || "color"
  );
  const [pageBgColor, setPageBgColor] = useState(
    settings.page_bg_color || "#ffffff"
  );
  const [pageBgGradient, setPageBgGradient] = useState(
    settings.page_bg_gradient || gradientPresets[0]
  );
  const [pageBgImage, setPageBgImage] = useState(
    settings.page_bg_image || ""
  );
  const [agentName, setAgentName] = useState(
    settings.agent_name || "Customer Support"
  );
  const [agentTitle, setAgentTitle] = useState(
    settings.agent_title || "Product Expert"
  );
  const [agentAvatar, setAgentAvatar] = useState(settings.agent_avatar || "");
  const [position, setPosition] = useState<WidgetPosition>(
    settings.widget_position
  );
  const [theme, setTheme] = useState<WidgetTheme>(settings.widget_theme);
  const [fontFamily, setFontFamily] = useState(
    settings.font_family || "system"
  );
  const [showPoweredBy, setShowPoweredBy] = useState(
    settings.show_powered_by !== false
  );
  const [customCss, setCustomCss] = useState(settings.custom_css || "");
  // Text colors (so customers & headers have proper contrast)
  const [textColor, setTextColor] = useState(settings.text_color || "#111827");
  const [subtitleColor, setSubtitleColor] = useState(
    settings.subtitle_color || "#000000"
  );
  const [headerTextColor, setHeaderTextColor] = useState(
    settings.header_text_color || "#000000"
  );
  const [poweredByColor, setPoweredByColor] = useState(
    settings.powered_by_color || "#9ca3af"
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function save() {
    setSaving(true);
    setSaved(false);
    const { error } = await supabase
      .from("account_settings")
      .update({
        widget_title: pageTitle,
        widget_color: headerBg,
        widget_position: position,
        widget_theme: theme,
        page_title: pageTitle,
        page_subtitle: pageSubtitle,
        header_bg_color: headerBg,
        customer_bubble_color: customerBubble,
        agent_bubble_color: agentBubble,
        page_bg_color: pageBgColor,
        page_bg_type: pageBgType,
        page_bg_gradient: pageBgGradient,
        page_bg_image: pageBgImage,
        agent_name: agentName,
        agent_title: agentTitle,
        agent_avatar: agentAvatar,
        show_powered_by: showPoweredBy,
        custom_css: customCss,
        font_family: fontFamily,
        welcome_message: pageSubtitle,
        text_color: textColor,
        subtitle_color: subtitleColor,
        header_text_color: headerTextColor,
        powered_by_color: poweredByColor,
      })
      .eq("account_id", settings.account_id);

    if (!error) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } else {
      alert("Gagal save: " + error.message);
    }
    setSaving(false);
  }

  const previewBg =
    pageBgType === "gradient"
      ? { background: pageBgGradient }
      : pageBgType === "image" && pageBgImage
      ? {
          backgroundImage: `url(${pageBgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : { background: pageBgColor };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Settings */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Chat Page Design
        </h1>
        <p className="text-gray-900 mb-6">
          Customize full chat page — colors, agent profile, typography
        </p>

        <div className="space-y-5 bg-white border border-gray-200 rounded-xl p-6">
          {/* Agent profile */}
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Agent Profile</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-900 rounded-lg text-sm text-gray-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={agentTitle}
                  onChange={(e) => setAgentTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-900 rounded-lg text-sm text-gray-900 outline-none"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-900 mb-1">
                Avatar
              </label>
              <div className="flex items-center gap-3">
                {agentAvatar && (
                  <img
                    src={agentAvatar}
                    alt="Agent avatar"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div className="flex-1 space-y-2">
                  <FileUpload
                    bucket="avatars"
                    path={`agent/${settings.account_id}`}
                    accept="image/*"
                    onUpload={(url) => setAgentAvatar(url)}
                  >
                    {({ onClick, uploading }) => (
                      <button
                        onClick={onClick}
                        disabled={uploading}
                        type="button"
                        className="w-full px-3 py-2 border border-gray-900 rounded-lg text-sm text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {uploading ? "Uploading..." : agentAvatar ? "Ganti foto" : "Upload foto"}
                      </button>
                    )}
                  </FileUpload>
                  {agentAvatar && (
                    <button
                      onClick={() => setAgentAvatar("")}
                      type="button"
                      className="w-full text-xs text-red-600 hover:text-red-700"
                    >
                      Hapus foto
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Page content */}
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Page Content</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">
                  Page Title
                </label>
                <input
                  type="text"
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-900 rounded-lg text-sm text-gray-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">
                  Subtitle / Welcome
                </label>
                <textarea
                  value={pageSubtitle}
                  onChange={(e) => setPageSubtitle(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-900 rounded-lg text-sm text-gray-900 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Colors</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-2">
                  Header & Buttons
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {colorPresets.map((c) => (
                    <button
                      key={c}
                      onClick={() => setHeaderBg(c)}
                      className={`w-7 h-7 rounded border-2 ${
                        headerBg === c
                          ? "border-gray-900 scale-110"
                          : "border-transparent"
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={headerBg}
                    onChange={(e) => setHeaderBg(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer"
                  />
                </div>
                <input
                  type="text"
                  value={headerBg}
                  onChange={(e) => setHeaderBg(e.target.value)}
                  className="text-xs font-mono w-full px-2 py-1 border border-gray-900 rounded outline-none text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-900 mb-2">
                  Customer Bubble
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {colorPresets.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCustomerBubble(c)}
                      className={`w-7 h-7 rounded border-2 ${
                        customerBubble === c
                          ? "border-gray-900 scale-110"
                          : "border-transparent"
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={customerBubble}
                    onChange={(e) => setCustomerBubble(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-900 mb-2">
                  Agent Bubble
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={agentBubble}
                    onChange={(e) => setAgentBubble(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={agentBubble}
                    onChange={(e) => setAgentBubble(e.target.value)}
                    className="text-xs font-mono flex-1 px-2 py-1 border border-gray-900 rounded outline-none text-gray-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Page background */}
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-semibold text-gray-900 mb-3">
              Page Background
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button
                onClick={() => setPageBgType("color")}
                className={`px-3 py-2 text-sm border rounded ${
                  pageBgType === "color"
                    ? "border-brand-600 bg-brand-50"
                    : "border-gray-900"
                }`}
              >
                Color
              </button>
              <button
                onClick={() => setPageBgType("gradient")}
                className={`px-3 py-2 text-sm border rounded ${
                  pageBgType === "gradient"
                    ? "border-brand-600 bg-brand-50"
                    : "border-gray-900"
                }`}
              >
                Gradient
              </button>
              <button
                onClick={() => setPageBgType("image")}
                className={`px-3 py-2 text-sm border rounded ${
                  pageBgType === "image"
                    ? "border-brand-600 bg-brand-50"
                    : "border-gray-900"
                }`}
              >
                Image
              </button>
            </div>

            {pageBgType === "color" && (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={pageBgColor}
                  onChange={(e) => setPageBgColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={pageBgColor}
                  onChange={(e) => setPageBgColor(e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-900 rounded text-xs font-mono outline-none text-gray-900"
                />
              </div>
            )}

            {pageBgType === "gradient" && (
              <div>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {gradientPresets.map((g) => (
                    <button
                      key={g}
                      onClick={() => setPageBgGradient(g)}
                      className={`h-12 rounded border-2 ${
                        pageBgGradient === g
                          ? "border-gray-900"
                          : "border-transparent"
                      }`}
                      style={{ background: g }}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={pageBgGradient}
                  onChange={(e) => setPageBgGradient(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-900 rounded text-xs font-mono outline-none text-gray-900"
                />
              </div>
            )}

            {pageBgType === "image" && (
              <input
                type="url"
                value={pageBgImage}
                onChange={(e) => setPageBgImage(e.target.value)}
                placeholder="https://example.com/bg.jpg"
                className="w-full px-3 py-2 border border-gray-900 rounded-lg text-sm text-gray-900 outline-none placeholder-gray-900"
              />
            )}
          </div>

          {/* Text Colors (for proper contrast) */}
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Text Colors</h3>
            <p className="text-xs text-gray-900 mb-3">
              Atur warna teks biar kontras sama background (ga nabrak)
            </p>
            <div className="space-y-3">
              <ColorRow label="Main text (agent bubble)" value={textColor} onChange={setTextColor} />
              <ColorRow label="Subtitle / labels" value={subtitleColor} onChange={setSubtitleColor} />
              <ColorRow label="Header text (on colored bg)" value={headerTextColor} onChange={setHeaderTextColor} />
              <ColorRow label="Powered by text" value={poweredByColor} onChange={setPoweredByColor} />
            </div>
          </div>

          {/* Typography */}
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Typography</h3>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full px-3 py-2 border border-gray-900 rounded-lg text-sm text-gray-900 outline-none"
            >
              {fonts.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-900 mt-2">
              Custom fonts perlu di-load dari Google Fonts di custom CSS di bawah
            </p>
          </div>

          {/* Advanced */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Advanced</h3>
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={showPoweredBy}
                onChange={(e) => setShowPoweredBy(e.target.checked)}
              />
              <span className="text-sm">Show "Powered by LiveChat"</span>
            </label>
            <details className="text-sm">
              <summary className="cursor-pointer text-gray-900 font-medium">
                Custom CSS
              </summary>
              <textarea
                value={customCss}
                onChange={(e) => setCustomCss(e.target.value)}
                rows={4}
                placeholder="/* e.g. @import url('...fonts.googleapis.com...') */"
                className="w-full mt-2 px-3 py-2 border border-gray-900 rounded-lg text-xs font-mono outline-none text-gray-900 placeholder-gray-900"
              />
            </details>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "✓ Saved" : "Save changes"}
          </button>
        </div>
      </div>

      {/* Live preview */}
      <div>
        <h2 className="text-sm font-medium text-gray-900 mb-2">Preview</h2>
        <div
          className="rounded-xl overflow-hidden border border-gray-200"
          style={{ ...previewBg, minHeight: "600px" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/30">
            <span className="font-semibold text-gray-900 text-sm">
              {agentName}
            </span>
            <span className="text-gray-900 text-xs">×</span>
          </div>

          <div className="flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
              <div
                className="px-4 py-3 flex items-center gap-2"
                style={{ background: headerBg, color: "white" }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden bg-white/20">
                  {agentAvatar ? (
                    <img
                      src={agentAvatar}
                      alt={agentName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    agentName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{agentName}</p>
                  <p className="text-xs opacity-90 truncate">{agentTitle}</p>
                </div>
              </div>
              <div className="p-6">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Let's chat!
                  </h3>
                  <p className="text-xs text-gray-900">{pageSubtitle}</p>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Name"
                    className="w-full px-3 py-2 border border-gray-900 rounded text-sm text-gray-900 placeholder-gray-900"
                  />
                  <input
                    type="email"
                    placeholder="E-mail"
                    className="w-full px-3 py-2 border border-gray-900 rounded text-sm text-gray-900 placeholder-gray-900"
                  />
                  <button
                    className="w-full text-white font-medium py-2 rounded-lg text-sm"
                    style={{ background: headerBg }}
                  >
                    Start the chat
                  </button>
                </div>
              </div>
              <div className="px-4 pb-3 space-y-2">
                <div
                  className="rounded-2xl rounded-tl-sm px-3 py-2 inline-block text-sm"
                  style={{ background: agentBubble, color: "#111827" }}
                >
                  Halo! {agentName} di sini 👋
                </div>
                <div
                  className="rounded-2xl rounded-tr-sm px-3 py-2 inline-block text-sm text-white ml-auto block max-w-fit"
                  style={{ background: customerBubble }}
                >
                  Halo, butuh bantuan dong
                </div>
              </div>
              {showPoweredBy && (
                <p className="text-xs text-gray-900 text-center pb-2">
                  Powered by LiveChat
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}