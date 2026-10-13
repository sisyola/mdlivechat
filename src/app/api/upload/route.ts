import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { image, filename } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }

    console.log("[Upload API] Starting upload to Supabase...");

    // Remove data URL prefix
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Create supabase client with service role
    const supabase = await createClient();

    // Create unique filename
    const timestamp = Date.now();
    const safeFilename = filename ? filename.replace(/[^a-zA-Z0-9.-]/g, "_") : "capture.jpg";
    const path = `login-captures/${timestamp}_${safeFilename}`;

    console.log("[Upload API] Uploading to:", path);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("login-captures")
      .upload(path, buffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (error) {
      console.error("[Upload API] Upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[Upload API] Upload success:", data);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("login-captures")
      .getPublicUrl(path);

    console.log("[Upload API] Public URL:", urlData.publicUrl);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error("[Upload API] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
