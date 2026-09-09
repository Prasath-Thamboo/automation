import { describe, expect, it } from "vitest";
import { isWithinQuietHours, localDateKey, localHour } from "./quiet-hours";

// 2026-06-15 20:30 UTC — l'été, Paris est à UTC+2 => 22:30 locale.
const summerEvening = new Date("2026-06-15T20:30:00Z");
// 2026-06-15 04:00 UTC => 06:00 à Paris.
const summerNight = new Date("2026-06-15T04:00:00Z");

describe("localHour", () => {
  it("convertit l'heure UTC dans le fuseau demandé", () => {
    expect(localHour(summerEvening, "Europe/Paris")).toBe(22);
    expect(localHour(summerEvening, "UTC")).toBe(20);
  });
});

describe("localDateKey", () => {
  it("rend la date locale au format AAAA-MM-JJ", () => {
    expect(localDateKey(new Date("2026-06-15T23:30:00Z"), "Europe/Paris")).toBe("2026-06-16");
    expect(localDateKey(new Date("2026-06-15T23:30:00Z"), "UTC")).toBe("2026-06-15");
  });
});

describe("isWithinQuietHours", () => {
  it("sans bornes => jamais de silence", () => {
    expect(isWithinQuietHours(summerNight, "Europe/Paris", null, null)).toBe(false);
    expect(isWithinQuietHours(summerNight, "Europe/Paris", "22:00", null)).toBe(false);
  });

  it("fenêtre qui passe minuit (22:00 → 07:00)", () => {
    expect(isWithinQuietHours(summerEvening, "Europe/Paris", "22:00", "07:00")).toBe(true); // 22:30
    expect(isWithinQuietHours(summerNight, "Europe/Paris", "22:00", "07:00")).toBe(true); // 06:00
    // 15:00 UTC => 17:00 Paris, hors fenêtre
    expect(
      isWithinQuietHours(new Date("2026-06-15T15:00:00Z"), "Europe/Paris", "22:00", "07:00"),
    ).toBe(false);
  });

  it("fenêtre en journée (13:00 → 14:00)", () => {
    // 11:30 UTC => 13:30 Paris
    expect(
      isWithinQuietHours(new Date("2026-06-15T11:30:00Z"), "Europe/Paris", "13:00", "14:00"),
    ).toBe(true);
    // 12:30 UTC => 14:30 Paris, juste après la borne de fin
    expect(
      isWithinQuietHours(new Date("2026-06-15T12:30:00Z"), "Europe/Paris", "13:00", "14:00"),
    ).toBe(false);
  });

  it("bornes égales => ignorées", () => {
    expect(isWithinQuietHours(summerNight, "Europe/Paris", "08:00", "08:00")).toBe(false);
  });
});
