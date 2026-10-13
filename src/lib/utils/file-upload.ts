/**
 * Upload file to Supabase Storage
 * @param file File to upload
 * @param bucket 'avatars' or 'attachments'
 * @param path Path within bucket (e.g. 'user-id/filename.jpg')
 * @returns Public URL of uploaded file
 */
import { createClient } from "@supabase/supabase-js";

export async function uploadFile(
  file: File,
  bucket: "avatars" | "attachments",
  path: string
): Promise<{ url: string; path: string; error?: string }> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Validate file size (5MB for avatars, 10MB for attachments)
    const maxSize = bucket === "avatars" ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        url: "",
        path: "",
        error: `File too large. Max ${maxSize / 1024 / 1024}MB`,
      };
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      return { url: "", path: "", error: error.message };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return { url: publicUrl, path: data.path };
  } catch (err) {
    return {
      url: "",
      path: "",
      error: err instanceof Error ? err.message : "Upload failed",
    };
  }
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Get file icon based on type
 */
export function getFileIcon(type: string): string {
  if (type.startsWith("image/")) return "🖼️";
  if (type === "application/pdf") return "📄";
  if (type.includes("word") || type.includes("document")) return "📝";
  if (type.startsWith("text/")) return "📃";
  return "📎";
}