"use client";

import { UploadCloud } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cx } from "./cx";
import styles from "./file-dropzone.module.css";

export function FileDropzone({
  accept,
  multiple = true,
  title,
  hint,
  onFiles,
  disabled,
}: {
  accept?: string;
  multiple?: boolean;
  title: ReactNode;
  hint?: ReactNode;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  const emit = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length > 0) onFiles(files);
  };

  return (
    <label
      htmlFor={inputId}
      className={cx(styles.dropzone, dragging && styles.dragging, disabled && styles.disabled)}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) emit(event.dataTransfer.files);
      }}
    >
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className={styles.input}
        onChange={(event) => {
          emit(event.target.files);
          event.target.value = "";
        }}
      />
      <span className={styles.icon} aria-hidden>
        <UploadCloud />
      </span>
      <span className={styles.title}>{title}</span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  );
}
