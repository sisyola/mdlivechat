import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { image, filename } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }

    // imgbb API key - add IMGBB_API_KEY to Vercel environment variables
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

    // If no API key configured, return error
    if (!IMGBB_API_KEY) {
      console.error("[Upload API] IMGBB_API_KEY not configured");
      return NextResponse.json({ error: "Upload service not configured" }, { status: 500 });
    }

    console.log("[Upload API] Uploading to imgbb...");
    console.log("[Upload API] Image data length:", image.length);

    // Remove data URL prefix if present
    const base64Image = image.replace(/^data:image\/\w+;base64,/, "");

    console.log("[Upload API] Image data length:", base64Image.length);
    const formData = new FormData();
    formData.append("key", IMGBB_API_KEY);
    formData.append("image", base64Image);
    formData.append("name", filename || "login-capture.jpg");

    const imgbbResponse = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });

    const imgbbResult = await imgbbResponse.json();

    if (!imgbbResult.success) {
      console.error("[Upload API] imgbb error:", imgbbResult);
      return NextResponse.json({ error: "Upload to imgbb failed" }, { status: 500 });
    }

    const imageUrl = imgbbResult.data.url;
    console.log("[Upload API] Success:", imageUrl);

    return NextResponse.json({ url: imageUrl });
  } catch (err) {
    console.error("[Upload API] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
