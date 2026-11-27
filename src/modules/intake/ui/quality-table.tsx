"use client";

import { Check } from "lucide-react";
import { Input, TBody, THead, Table, Td, Th, Tr } from "@/shared/ui";
import { qualityDiscountTotal } from "../domain/rules";
import type { FieldPath, QualityKey } from "../domain/types";
import { QUALITY_KEYS } from "../domain/types";
import { formatKg, qualityLabels } from "./labels";
import { useReview, useReviewField } from "./review-context";
import styles from "./intake.module.css";

function QualityCell({ path, label }: { path: FieldPath; label: string }) {
  const field = useReviewField(path);
  return (
    <Input
      id={field.id}
      controlSize="sm"
      numeric
      inputMode="decimal"
      aria-label={label}
      value={field.value}
      onChange={(event) => field.setValue(event.target.value)}
      attention={field.pending}
      invalid={Boolean(field.error)}
      title={field.suggestion ? `OCR ${Math.round(field.suggestion.confidence * 100)} %${field.edited ? ` · leyó ${field.suggestion.value}` : ""}` : undefined}
      data-pending={field.pending || undefined}
      autoComplete="off"
      className={styles.qualityInput}
    />
  );
}

function RowConfirm({ qualityKey }: { qualityKey: QualityKey }) {
  const review = useReview();
  const percent = useReviewField(`quality.${qualityKey}.percent`);
  const discount = useReviewField(`quality.${qualityKey}.discountKg`);
  const pending = [percent.pending && percent, discount.pending && discount].filter(Boolean);
  if (pending.length === 0 || review.readOnly) return null;
  return (
    <button
      type="button"
      className={styles.confirmButton}
      onClick={() =>
        review.confirm(
          [percent.pending && `quality.${qualityKey}.percent`, discount.pending && `quality.${qualityKey}.discountKg`].filter(
            Boolean,
          ) as FieldPath[],
        )
      }
    >
      <Check aria-hidden />
      Confirmar
    </button>
  );
}

export function QualityTable() {
  const { fields } = useReview();
  const total = qualityDiscountTotal(fields);

  return (
    <Table compact className={styles.qualityTable}>
      <THead>
        <tr>
          <Th>Análisis</Th>
          <Th align="end">Resultado (%)</Th>
          <Th align="end">Descuento (kg)</Th>
          <Th align="end">
            <span className="sr-only">Verificación</span>
          </Th>
        </tr>
      </THead>
      <TBody>
        {QUALITY_KEYS.map((key) => (
          <Tr key={key}>
            <Td>{qualityLabels[key]}</Td>
            <Td align="end">
              <QualityCell path={`quality.${key}.percent`} label={`${qualityLabels[key]}, resultado en porcentaje`} />
            </Td>
            <Td align="end">
              <QualityCell path={`quality.${key}.discountKg`} label={`${qualityLabels[key]}, descuento en kilos`} />
            </Td>
            <Td align="end" shrink>
              <RowConfirm qualityKey={key} />
            </Td>
          </Tr>
        ))}
        <Tr className={styles.totalRow}>
          <Td>Total descuento</Td>
          <Td />
          <Td numeric>{formatKg(total)}</Td>
          <Td />
        </Tr>
      </TBody>
    </Table>
  );
}
