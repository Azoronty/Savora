import { describe, expect, it } from "vitest";
import { addDays, daysBetween, isIsoDate, startOfWeek, todayIn } from "../dates";
import { compareByUrgency, getExpiry } from "../expiry";

describe("date-only helpers", () => {
  it("validates real calendar dates only", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("26-01-01")).toBe(false);
  });

  it("adds days across month, year and DST boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30"); // EU DST switch
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31"); // US DST switch
  });

  it("counts whole days between dates", () => {
    expect(daysBetween("2026-11-06", "2026-11-06")).toBe(0);
    expect(daysBetween("2026-11-06", "2026-11-09")).toBe(3);
    expect(daysBetween("2026-11-06", "2026-11-04")).toBe(-2);
  });

  it("resolves 'today' in the viewer's time zone, not the server's", () => {
    const instant = new Date("2026-11-06T23:30:00Z");
    expect(todayIn("UTC", instant)).toBe("2026-11-06");
    expect(todayIn("Asia/Tashkent", instant)).toBe("2026-11-07"); // UTC+5
    expect(todayIn("America/Los_Angeles", instant)).toBe("2026-11-06");
    expect(todayIn("Not/AZone", instant)).toBe("2026-11-06"); // falls back to UTC
  });

  it("finds the Monday of a week", () => {
    expect(startOfWeek("2026-11-06")).toBe("2026-11-02"); // Friday → Monday
    expect(startOfWeek("2026-11-02")).toBe("2026-11-02");
    expect(startOfWeek("2026-11-08")).toBe("2026-11-02"); // Sunday
  });
});

describe("expiry status", () => {
  const today = "2026-11-06";

  it("classifies fresh, use-soon and past-date items", () => {
    expect(getExpiry("2026-11-05", today)).toMatchObject({ status: "expired", daysLeft: -1, label: "1 day past" });
    expect(getExpiry("2026-11-06", today)).toMatchObject({ status: "soon", daysLeft: 0, label: "Date is today" });
    expect(getExpiry("2026-11-09", today)).toMatchObject({ status: "soon", daysLeft: 3 });
    expect(getExpiry("2026-11-10", today)).toMatchObject({ status: "fresh", daysLeft: 4 });
  });

  it("labels long horizons in weeks and months", () => {
    expect(getExpiry("2026-11-26", today).label).toBe("3 weeks left");
    expect(getExpiry("2027-03-06", today).label).toBe("4 months left");
  });

  it("sorts most urgent first, then by name", () => {
    const items = [
      { name: "Milk", expires_on: "2026-11-08" },
      { name: "Bread", expires_on: "2026-11-04" },
      { name: "Apples", expires_on: "2026-11-08" },
    ];
    expect([...items].sort(compareByUrgency).map((i) => i.name)).toEqual(["Bread", "Apples", "Milk"]);
  });
});
