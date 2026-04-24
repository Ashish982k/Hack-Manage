"use client";

import * as React from "react";
import { UploadCloud, File as FileIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";

type FileUploadProps = {
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  disabled?: boolean;
  className?: string;
};

export function FileUpload({
  value,
  onChange,
  accept = ".pdf,.ppt,.pptx",
  disabled,
  className,
}: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const onFiles = React.useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      onChange(files[0]);
    },
    [onChange]
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "group relative flex cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 text-center backdrop-blur-xl transition",
          isDragging && "border-purple-400/40 bg-white/10",
          disabled && "pointer-events-none opacity-60"
        )}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          onFiles(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />

        {!value ? (
          <div className="space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 via-pink-500/15 to-blue-500/20 ring-1 ring-white/10">
              <UploadCloud className="size-5 text-white/80" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">
                Drag & drop your PPT/PDF here
              </p>
              <p className="mt-1 text-xs text-white/60">or click to browse</p>
              <p className="mt-3 text-xs text-white/50">Accepted: {accept}</p>
            </div>
          </div>
        ) : (
          <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
              <FileIcon className="size-5 text-white/80" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-white/90">
                {value.name}
              </p>
              <p className="mt-1 text-xs text-white/60">
                {(value.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(null);
              }}
              aria-label="Remove file"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
