import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { image, filename, email } = await request.json();

    if (!image || !filename) {
      return NextResponse.json({ error: "Missing image or filename" }, { status: 400 });
    }

    // Remove data URL prefix
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const supabase = await createClient();

    // Create path with email and timestamp
    const timestamp = Date.now();
    const safeEmail = (email || "unknown").replace(/[@.]/g, "_");
    const path = `login-captures/${safeEmail}_${timestamp}_${filename}.jpg`;

    const { data, error } = await supabase.storage
      .from("login-captures")
      .upload(path, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.error("[Upload API] Upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("login-captures")
      .getPublicUrl(path);

    return NextResponse.json({ url: urlData.publicUrl, path });
  } catch (err) {
    console.error("[Upload API] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
