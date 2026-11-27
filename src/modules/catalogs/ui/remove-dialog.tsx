"use client";

import { useState } from "react";
import { Button, Dialog } from "@/shared/ui";

export function RemoveDialog({
  name,
  usage,
  retired,
  retireLabel,
  onClose,
  onRemove,
  onRetire,
}: {
  name: string;
  usage: string | null;
  retired: boolean;
  retireLabel: string;
  onClose: () => void;
  onRemove: () => Promise<unknown>;
  onRetire: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const run = (action: () => Promise<unknown>) => async () => {
    setBusy(true);
    await action();
    onClose();
  };

  if (usage) {
    return (
      <Dialog
        open
        onClose={onClose}
        title={`No se puede eliminar «${name}»`}
        footer={
          retired ? (
            <Button onClick={onClose}>Entendido</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" loading={busy} onClick={run(onRetire)}>
                {retireLabel}
              </Button>
            </>
          )
        }
      >
        {usage}{" "}
        {retired
          ? "Ya no aparece al registrar boletas nuevas y su histórico se conserva."
          : "Puedes dejarlo fuera de las boletas nuevas sin perder su histórico."}
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`¿Eliminar «${name}»?`}
      description="No tiene registros asociados. Esta acción no se puede deshacer."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" loading={busy} onClick={run(onRemove)}>
            Eliminar
          </Button>
        </>
      }
    />
  );
}
