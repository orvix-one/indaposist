"use client";

import { Info } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./tooltip.module.css";

const GAP = 6;
const MARGIN = 8;

type Placement = { left: number; top: number; below: boolean };

function placementFor(trigger: HTMLElement): Placement {
  const rect = trigger.getBoundingClientRect();
  const left = Math.min(Math.max(rect.left + rect.width / 2, MARGIN + 120), window.innerWidth - MARGIN - 120);
  const below = rect.top < 80;
  return { left, top: below ? rect.bottom + GAP : rect.top - GAP, below };
}

export function InfoTooltip({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);

  const show = () => {
    if (triggerRef.current) setPlacement(placementFor(triggerRef.current));
  };
  const hide = () => setPlacement(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-describedby={placement ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={show}
        onKeyDown={(event) => {
          if (event.key === "Escape") hide();
        }}
      >
        <Info aria-hidden />
      </button>
      {placement &&
        createPortal(
          <span
            role="tooltip"
            id={id}
            className={styles.bubble}
            data-below={placement.below || undefined}
            style={{ left: placement.left, top: placement.top }}
          >
            {children}
          </span>,
          document.body,
        )}
    </>
  );
}
