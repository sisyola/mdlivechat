import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { image, filename } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }

    // imgbb API key - get yours free at https://api.imgbb.com/
    // For demo, using a placeholder - replace with your own API key
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY || "demo_key";

    console.log("[Upload API] Uploading to imgbb...");
    console.log("[Upload API] Image data length:", image.length);

    // Remove data URL prefix if present
    const base64Image = image.replace(/^data:image\/\w+;base64,/, "");

    // If no real API key, return a placeholder URL for testing
    if (IMGBB_API_KEY === "demo_key") {
      // Return the base64 as a data URL for testing purposes
      // Note: Discord may not accept very large data URLs
      return NextResponse.json({
        url: image,
        note: "Using data URL (no imgbb API key configured)"
      });
    }

    // Upload to imgbb
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
