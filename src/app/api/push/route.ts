import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Using dynamic require to avoid TypeScript issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminApp: any = null;

async function initFirebase() {
  if (adminApp) return adminApp;

  const credentialsJson = process.env.FIREBASE_CREDENTIALS;

  if (credentialsJson) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const admin = require("firebase-admin");
      const credentials = JSON.parse(credentialsJson);

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(credentials),
        });
      }

      adminApp = admin;
      console.log("[Push] Firebase Admin initialized");
      return adminApp;
    } catch (err) {
      console.error("[Push] Failed to init Firebase:", err);
      return null;
    }
  }

  console.log("[Push] No Firebase credentials");
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { token, userId } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase.from("device_tokens").upsert(
      { user_id: userId, token, created_at: new Date().toISOString() },
      { onConflict: "token" }
    );

    if (error) {
      console.error("[Push] Error storing token:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Push] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const firebaseAdmin = await initFirebase();

  if (!firebaseAdmin) {
    return NextResponse.json({ error: "Firebase not configured" }, { status: 500 });
  }

  try {
    const { userId, title, body, data } = await request.json();

    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: "userId, title, and body required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: tokens, error } = await supabase
      .from("device_tokens")
      .select("token")
      .eq("user_id", userId);

    if (error) {
      console.error("[Push] Error fetching tokens:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ message: "No tokens found", sent: 0 });
    }

    const results = await Promise.allSettled(
      tokens.map((t: { token: string }) =>
        firebaseAdmin.messaging().send({
          token: t.token,
          notification: { title, body },
          data: data || {},
          android: {
            priority: "high",
            notification: {
              channelId: "mdlivechat_chat",
              priority: "high",
            },
          },
        })
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({ sent, failed });
  } catch (err) {
    console.error("[Push] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
