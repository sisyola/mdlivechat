"use client";

import ClientOnly from "./ClientOnly";

interface HydrationWrapperProps {
  children: React.ReactNode;
}

export default function HydrationWrapper({ children }: HydrationWrapperProps) {
  return <ClientOnly>{children}</ClientOnly>;
}
