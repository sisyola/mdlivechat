// ============================================
// Live Chat - Embeddable Widget
// ============================================
// Usage:
//   <script
//     src="https://your-domain.com/widget.js"
//     data-supabase-url="https://xxx.supabase.co"
//     data-supabase-key="your-anon-key"
//     data-position="bottom-right"
//     data-color="#3b82f6"
//     defer
//   ></script>
// ============================================

(function () {
  "use strict";

  // Find the current script tag (the one that loaded this file)
  const currentScript =
    document.currentScript ||
    (function () {
      const scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

  // Read config from data attributes
  const SUPABASE_URL = currentScript.getAttribute("data-supabase-url");
  const SUPABASE_KEY = currentScript.getAttribute("data-supabase-key");
  const POSITION = currentScript.getAttribute("data-position") || "bottom-right";
  const COLOR = currentScript.getAttribute("data-color") || "#3b82f6";
  const TITLE = currentScript.getAttribute("data-title") || "Chat dengan kami";

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error(
      "[LiveChat Widget] Missing data-supabase-url or data-supabase-key"
    );
    return;
  }

  // Create container for the bubble + iframe
  const container = document.createElement("div");
  container.id = "livechat-widget-container";
  container.style.cssText = `
    position: fixed;
    z-index: 999999;
    ${POSITION.includes("right") ? "right: 20px;" : "left: 20px;"}
    ${POSITION.includes("bottom") ? "bottom: 20px;" : "top: 20px;"}
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
  document.body.appendChild(container);

  // Build widget URL with config as query params
  const widgetUrl = new URL("/widget", currentScript.src);
  widgetUrl.searchParams.set("supabaseUrl", SUPABASE_URL);
  widgetUrl.searchParams.set("supabaseKey", SUPABASE_KEY);
  widgetUrl.searchParams.set("color", encodeURIComponent(COLOR));
  widgetUrl.searchParams.set("title", encodeURIComponent(TITLE));

  // Chat bubble button
  const bubble = document.createElement("button");
  bubble.id = "livechat-bubble";
  bubble.setAttribute("aria-label", "Open chat");
  bubble.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;
  bubble.style.cssText = `
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: ${COLOR};
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s, box-shadow 0.2s;
  `;
  bubble.onmouseover = () => {
    bubble.style.transform = "scale(1.05)";
    bubble.style.boxShadow = "0 6px 16px rgba(0,0,0,0.2)";
  };
  bubble.onmouseout = () => {
    bubble.style.transform = "scale(1)";
    bubble.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  };
  container.appendChild(bubble);

  // iframe for the actual chat (created on demand)
  let iframe = null;
  let isOpen = false;

  function openChat() {
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.src = widgetUrl.toString();
      iframe.title = "Live Chat";
      iframe.style.cssText = `
        position: fixed;
        z-index: 999998;
        ${POSITION.includes("right") ? "right: 20px;" : "left: 20px;"}
        ${POSITION.includes("bottom") ? "bottom: 100px;" : "top: 100px;"}
        width: 380px;
        height: 560px;
        max-width: calc(100vw - 40px);
        max-height: calc(100vh - 140px);
        border: none;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        background: white;
      `;
      document.body.appendChild(iframe);
    } else {
      iframe.style.display = "block";
    }
    isOpen = true;
    bubble.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
  }

  function closeChat() {
    if (iframe) iframe.style.display = "none";
    isOpen = false;
    bubble.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
  }

  bubble.onclick = () => {
    if (isOpen) closeChat();
    else openChat();
  };
})();
