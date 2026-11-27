import { CircleAlert } from "lucide-react";
import type { CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx } from "./cx";
import styles from "./forms.module.css";

type FieldProps = {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, hint, error, optional, aside, className, children }: FieldProps) {
  return (
    <div className={cx(styles.field, className)}>
      <div className={styles.labelRow}>
        <label htmlFor={htmlFor} className={styles.label}>
          {label}
          {optional && <span className={styles.optional}> · Opcional</span>}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className={styles.error}>
          <CircleAlert aria-hidden />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-hint`} className={styles.hint}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

type ControlOptions = {
  invalid?: boolean;
  attention?: boolean;
  controlSize?: "sm" | "md";
};

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> &
  ControlOptions & {
    leading?: ReactNode;
    trailing?: ReactNode;
    numeric?: boolean;
  };

export function Input({
  invalid,
  attention,
  controlSize = "md",
  leading,
  trailing,
  numeric,
  className,
  style,
  ...props
}: InputProps) {
  const sizeClass = cx(controlSize === "sm" && styles.sm, attention && styles.attention);

  if (!leading && !trailing) {
    return (
      <input
        aria-invalid={invalid || undefined}
        className={cx(styles.control, sizeClass, numeric && styles.numeric, className)}
        style={style}
        {...props}
      />
    );
  }

  return (
    <div className={cx(styles.control, styles.group, sizeClass, className)} style={style}>
      {leading && <span className={styles.addon}>{leading}</span>}
      <input aria-invalid={invalid || undefined} className={cx(numeric && styles.numeric)} {...props} />
      {trailing && <span className={styles.addon}>{trailing}</span>}
    </div>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & Pick<ControlOptions, "invalid">;

export function Textarea({ invalid, className, ...props }: TextareaProps) {
  return (
    <textarea aria-invalid={invalid || undefined} className={cx(styles.control, styles.textarea, className)} {...props} />
  );
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & ControlOptions;

export function Select({ invalid, attention, controlSize = "md", className, children, ...props }: SelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cx(styles.control, styles.select, controlSize === "sm" && styles.sm, attention && styles.attention, className)}
      {...props}
    >
      {children}
    </select>
  );
}

type ChoiceProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: ReactNode;
  description?: ReactNode;
};

function Choice({ kind, label, description, className, ...props }: ChoiceProps & { kind: "checkbox" | "radio" | "switch" }) {
  const control = (
    <input
      type={kind === "radio" ? "radio" : "checkbox"}
      role={kind === "switch" ? "switch" : undefined}
      className={styles[kind]}
      {...props}
    />
  );

  if (!label) return control;

  return (
    <label className={cx(styles.choice, className)}>
      {control}
      <span className={styles.choiceText}>
        <span className={styles.choiceLabel}>{label}</span>
        {description && <span className={styles.choiceDescription}>{description}</span>}
      </span>
    </label>
  );
}

export function Checkbox(props: ChoiceProps) {
  return <Choice kind="checkbox" {...props} />;
}

export function Radio(props: ChoiceProps) {
  return <Choice kind="radio" {...props} />;
}

export function Switch(props: ChoiceProps) {
  return <Choice kind="switch" {...props} />;
}

export function Fieldset({ legend, children }: { legend: ReactNode; children: ReactNode }) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>
      {children}
    </fieldset>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div>
        <h3 className={styles.sectionTitle}>{title}</h3>
        {description && <p className={styles.sectionDescription}>{description}</p>}
      </div>
      <div>{children}</div>
    </section>
  );
}

export function FormGrid({ columns = 2, children }: { columns?: 1 | 2 | 3 | 4; children: ReactNode }) {
  return (
    <div className={styles.grid} style={{ "--cols": columns } as CSSProperties}>
      {children}
    </div>
  );
}

export const formLayout = { span2: styles.span2, spanFull: styles.spanFull };
