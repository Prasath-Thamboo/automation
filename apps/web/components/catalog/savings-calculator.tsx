"use client";

import { useId, useState } from "react";
import type { TemplateContent } from "@tando/api-client";

type Savings = TemplateContent["savings"];

/**
 * « Ce qu'il vous fait gagner » (§5.1 point 6) : deux curseurs → une estimation
 * d'heures par mois. Calcul volontairement simple et transparent (la note
 * explique d'où vient le chiffre).
 */
export function SavingsCalculator({ savings }: { savings: Savings }) {
  const [a, setA] = useState(savings.sliderA.default);
  const [b, setB] = useState(savings.sliderB.default);

  const minutesPerDay = a * savings.sliderA.minutesEach + b * savings.sliderB.minutesEach;
  const hoursPerMonth = Math.round((minutesPerDay * savings.daysPerMonth) / 60);

  return (
    <div className="rounded-lg border border-ink-100 bg-white p-5">
      <Slider
        label={savings.sliderA.label}
        min={savings.sliderA.min}
        max={savings.sliderA.max}
        value={a}
        onChange={setA}
      />
      <div className="mt-5">
        <Slider
          label={savings.sliderB.label}
          min={savings.sliderB.min}
          max={savings.sliderB.max}
          value={b}
          onChange={setB}
        />
      </div>

      <p className="mt-6 text-lg text-ink-900">
        Environ{" "}
        <span className="font-heading text-2xl font-bold text-primary-700">
          {hoursPerMonth} heures
        </span>{" "}
        gagnées par mois.
      </p>
      <p className="mt-2 text-sm text-ink-500">{savings.note}</p>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (n: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="flex items-center justify-between text-base font-medium text-ink-900">
        <span>{label}</span>
        <span className="font-heading font-bold">{value}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-11 w-full accent-primary-600"
      />
    </div>
  );
}
