// LiveChat Widget - Standalone embed script
// Usage: <script src="https://your-domain.com/widget-embed.js?account=19854478" defer></script>

(function () {
  "use strict";

  // Get account number from script src
  const scripts = document.getElementsByTagName("script");
  let accountNumber = "";
  for (let i = scripts.length - 1; i >= 0; i--) {
    const src = scripts[i].getAttribute("src") || "";
    if (src.includes("widget-embed.js")) {
      try {
        const url = new URL(src);
        accountNumber = url.searchParams.get("account") || "";
      } catch {
        const match = src.match(/[?&]account=([^&]+)/);
        if (match) accountNumber = match[1];
      }
      break;
    }
  }

  if (!accountNumber) {
    console.error("[LiveChat] Missing account parameter in script src");
    return;
  }

  // Determine base URL
  const baseUrl = (function () {
    const s =
      Array.from(document.getElementsByTagName("script"))
        .map((x) => x.src)
        .find((x) => x.includes("widget-embed.js")) || "";
    try {
      return new URL(s).origin;
    } catch {
      return window.location.origin;
    }
  })();

  const widgetUrl = `${baseUrl}/${accountNumber}?embed=1`;

  // Create bubble
  const bubble = document.createElement("button");
  bubble.setAttribute("aria-label", "Open chat");
  bubble.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;
  bubble.style.cssText = `
    position: fixed !important;
    bottom: 20px !important;
    right: 20px !important;
    z-index: 999999 !important;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #3b82f6;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s;
  `;
  bubble.onmouseenter = () => {
    bubble.style.transform = "scale(1.05)";
  };
  bubble.onmouseleave = () => {
    bubble.style.transform = "scale(1)";
  };
  document.body.appendChild(bubble);

  let iframe = null;
  let isOpen = false;

  function openChat() {
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.src = widgetUrl;
      iframe.title = "Live Chat";
      iframe.style.cssText = `
        position: fixed !important;
        bottom: 90px !important;
        right: 20px !important;
        z-index: 999998 !important;
        width: 380px;
        height: 560px;
        max-width: calc(100vw - 40px);
        max-height: calc(100vh - 120px);
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