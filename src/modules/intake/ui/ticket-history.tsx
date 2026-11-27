import { ArrowRight } from "lucide-react";
import { Badge } from "@/shared/ui";
import type { HistoryEntry } from "../domain/types";
import { formatInstant, historyLabels, ticketStatusMeta } from "./labels";
import styles from "./intake.module.css";

export function TicketHistory({ entries }: { entries: HistoryEntry[] }) {
  return (
    <ol className={styles.timeline}>
      {[...entries].reverse().map((entry) => (
        <li key={entry.id} className={styles.timelineItem} data-action={entry.action}>
          <span className={styles.timelineDot} aria-hidden />
          <div className={styles.timelineBody}>
            <p className={styles.timelineTitle}>
              <strong>{entry.actor}</strong> · {historyLabels[entry.action]}
            </p>
            <p className={styles.timelineMeta}>
              <time dateTime={entry.at}>{formatInstant(entry.at)}</time>
              {entry.from && entry.to && (
                <span className={styles.transition}>
                  <Badge tone={ticketStatusMeta[entry.from].tone}>{ticketStatusMeta[entry.from].label}</Badge>
                  <ArrowRight aria-hidden />
                  <Badge tone={ticketStatusMeta[entry.to].tone}>{ticketStatusMeta[entry.to].label}</Badge>
                </span>
              )}
            </p>
            {entry.comment && <p className={styles.timelineComment}>{entry.comment}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
