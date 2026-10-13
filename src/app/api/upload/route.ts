import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { image, filename } = await request.json();

    if (!image) {
      console.log("[Upload API] No image provided");
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }

    const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

    if (!IMGBB_API_KEY) {
      console.log("[Upload API] No API key");
      return NextResponse.json({ error: "Upload service not configured" }, { status: 500 });
    }

    console.log("[Upload API] Image length:", image.length);

    // Remove data URL prefix
    const base64Image = image.replace(/^data:image\/\w+;base64,/, "");
    console.log("[Upload API] Base64 length:", base64Image.length);

    const formData = new FormData();
    formData.append("key", IMGBB_API_KEY);
    formData.append("image", base64Image);
    formData.append("name", filename || "capture.jpg");

    console.log("[Upload API] Sending to imgbb...");

    const imgbbResponse = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });

    console.log("[Upload API] Response status:", imgbbResponse.status);

    const imgbbResult = await imgbbResponse.json();
    console.log("[Upload API] imgbb result:", JSON.stringify(imgbbResult));

    if (!imgbbResult.success) {
      return NextResponse.json({ error: "Upload failed", details: imgbbResult }, { status: 500 });
    }

    // Use display_url for better compatibility
    const imageUrl = imgbbResult.data.display_url || imgbbResult.data.url;
    console.log("[Upload API] Success - URL:", imageUrl);
    console.log("[Upload API] Display URL:", imgbbResult.data.display_url);

    return NextResponse.json({ url: imageUrl });
  } catch (err) {
    console.error("[Upload API] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
