import type { Metadata } from "next";
import { ReactNode } from "react";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Live Chat",
  description: "Real-time customer support chat",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Script
          id="remove-extension-attrs"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var attrsToRemove = ['bis_skin_checked', 'bis_register'];
                attrsToRemove.forEach(function(attr) {
                  Object.defineProperty(Element.prototype, attr, {
                    get: function() { return null; },
                    set: function() {},
                    configurable: true
                  });
                });
                var observer = new MutationObserver(function(mutations) {
                  mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes') {
                      var attr = mutation.attributeName;
                      if (attrsToRemove.indexOf(attr) !== -1) {
                        mutation.target.removeAttribute(attr);
                      }
                    }
                  });
                });
                if (document.body) {
                  observer.observe(document.body, { attributes: true, subtree: true });
                } else {
                  document.addEventListener('DOMContentLoaded', function() {
                    observer.observe(document.body, { attributes: true, subtree: true });
                  });
                }
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
