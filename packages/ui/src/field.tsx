import { clsx } from "clsx";
import { useId, type InputHTMLAttributes } from "react";

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Message d'erreur orienté action (§9.5) — jamais un détail technique. */
  error?: string;
  hint?: string;
}

/** Champ de formulaire accessible : label lié, erreur annoncée, texte 16px. */
export function Field({ label, error, hint, id, className, ...rest }: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  return (
    <div className={clsx("tnd-field", className)}>
      <label htmlFor={fieldId} className="tnd-field__label">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="tnd-field__hint">
          {hint}
        </p>
      ) : null}
      <input
        {...rest}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={clsx(hint && hintId, error && errorId) || undefined}
        className="tnd-field__input"
      />
      {error ? (
        <p id={errorId} role="alert" className="tnd-field__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
