"use client";

import { useState, useRef } from "react";
import { uploadFile, formatFileSize, getFileIcon } from "@/lib/utils/file-upload";

interface FileUploadProps {
  bucket: "avatars" | "attachments";
  path: string;
  onUpload: (url: string, file: File) => void;
  accept?: string;
  multiple?: boolean;
  children: (props: {
    onClick: () => void;
    uploading: boolean;
  }) => React.ReactNode;
}

export default function FileUpload({
  bucket,
  path,
  onUpload,
  accept = "image/*",
  multiple = false,
  children,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fullPath = `${path}/${Date.now()}_${file.name}`;
        const result = await uploadFile(file, bucket, fullPath);
        if (result.error) {
          alert(`Upload failed: ${result.error}`);
        } else {
          onUpload(result.url, file);
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
      {children({ onClick: handleClick, uploading })}
    </>
  );
}

export { formatFileSize, getFileIcon };