"use client";

import { Check } from "lucide-react";
import { createContext, useContext, type ReactNode } from "react";
import { Badge, Field, Input, Select, Textarea, cx } from "@/shared/ui";
import { CONFIDENCE_THRESHOLD, getFieldValue } from "../domain/rules";
import type { FieldPath, Suggestion, TicketFields } from "../domain/types";
import type { CatalogItem } from "../mock/catalogs";
import { fieldId, fieldLabel } from "./labels";
import styles from "./intake.module.css";

export type ReviewContextValue = {
  fields: TicketFields;
  suggestions: Partial<Record<FieldPath, Suggestion>>;
  verified: FieldPath[];
  errors: Partial<Record<FieldPath, string>>;
  readOnly: boolean;
  setValue: (path: FieldPath, value: string) => void;
  confirm: (paths: FieldPath[]) => void;
};

const ReviewContext = createContext<ReviewContextValue | null>(null);

export const ReviewProvider = ReviewContext.Provider;

export function useReview() {
  const context = useContext(ReviewContext);
  if (!context) throw new Error("useReview requiere ReviewProvider.");
  return context;
}

export function useReviewField(path: FieldPath) {
  const review = useReview();
  const value = getFieldValue(review.fields, path);
  const suggestion = review.suggestions[path];
  const low = suggestion ? suggestion.confidence < CONFIDENCE_THRESHOLD : false;
  const edited = suggestion ? value !== suggestion.value : false;
  const verified = review.verified.includes(path);
  return {
    id: fieldId(path),
    value,
    suggestion,
    low,
    edited,
    verified,
    pending: low && !edited && !verified,
    error: review.errors[path],
    readOnly: review.readOnly,
    setValue: (next: string) => review.setValue(path, next),
    confirm: () => review.confirm([path]),
  };
}

function percent(confidence: number) {
  return `${Math.round(confidence * 100)} %`;
}

function OcrMeta({ path }: { path: FieldPath }) {
  const field = useReviewField(path);
  if (!field.suggestion) return null;

  if (field.pending) {
    return (
      <span className={styles.ocrMeta}>
        <Badge tone="warning">{percent(field.suggestion.confidence)}</Badge>
        {!field.readOnly && (
          <button type="button" className={styles.confirmButton} onClick={field.confirm}>
            <Check aria-hidden />
            Confirmar
          </button>
        )}
      </span>
    );
  }
  if (field.edited) return <span className={styles.ocrMeta}>Corregido</span>;
  if (field.low && field.verified) {
    return (
      <span className={cx(styles.ocrMeta, styles.ocrConfirmed)}>
        <Check aria-hidden />
        Confirmado
      </span>
    );
  }
  return <span className={styles.ocrMeta}>OCR {percent(field.suggestion.confidence)}</span>;
}

type ReviewFieldProps = {
  path: FieldPath;
  label?: string;
  type?: "text" | "date" | "datetime-local";
  numeric?: boolean;
  trailing?: ReactNode;
  leading?: ReactNode;
  options?: CatalogItem[];
  placeholder?: string;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
  disabled?: boolean;
  multiline?: boolean;
};

export function ReviewField({
  path,
  label,
  type = "text",
  numeric,
  trailing,
  leading,
  options,
  placeholder,
  hint,
  optional,
  className,
  disabled,
  multiline,
}: ReviewFieldProps) {
  const field = useReviewField(path);
  const suggestionText =
    field.suggestion && field.edited
      ? `OCR leyó: ${options?.find((option) => option.id === field.suggestion!.value)?.name ?? field.suggestion.value}`
      : undefined;
  const describedBy = field.error ? `${field.id}-error` : hint || suggestionText ? `${field.id}-hint` : undefined;

  return (
    <Field
      label={label ?? fieldLabel(path)}
      htmlFor={field.id}
      optional={optional}
      aside={<OcrMeta path={path} />}
      error={field.error}
      hint={suggestionText ?? hint}
      className={className}
    >
      {multiline ? (
        <Textarea
          id={field.id}
          value={field.value}
          onChange={(event) => field.setValue(event.target.value)}
          placeholder={placeholder}
          aria-describedby={describedBy}
          disabled={disabled}
        />
      ) : options ? (
        <Select
          id={field.id}
          value={field.value}
          onChange={(event) => field.setValue(event.target.value)}
          invalid={Boolean(field.error)}
          attention={field.pending}
          aria-describedby={describedBy}
          disabled={disabled}
          data-pending={field.pending || undefined}
        >
          <option value="">Seleccionar…</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </Select>
      ) : (
        <Input
          id={field.id}
          type={type}
          value={field.value}
          onChange={(event) => field.setValue(event.target.value)}
          invalid={Boolean(field.error)}
          attention={field.pending}
          numeric={numeric}
          inputMode={numeric ? "decimal" : undefined}
          trailing={trailing}
          leading={leading}
          placeholder={placeholder}
          aria-describedby={describedBy}
          disabled={disabled}
          data-pending={field.pending || undefined}
          autoComplete="off"
        />
      )}
    </Field>
  );
}
