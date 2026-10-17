import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime } from "./format";

describe("formatDate", () => {
  it("formats a Date", () => {
    expect(formatDate(new Date("2026-10-17T12:00:00Z"))).toBe("17 Oct 2026");
  });

  it("formats an ISO string", () => {
    expect(formatDate("2026-01-05T00:00:00.000Z")).toBe("5 Jan 2026");
  });

  it("renders in UTC, so a late-evening timestamp is not the next day", () => {
    // 23:30 UTC is the 18th in any timezone east of UTC+0.5.
    expect(formatDate(new Date("2026-10-17T23:30:00Z"))).toBe("17 Oct 2026");
  });
});

describe("formatDateTime", () => {
  it("includes the time and the zone", () => {
    expect(formatDateTime(new Date("2026-10-17T23:30:00Z"))).toBe(
      "17 Oct 2026, 23:30 UTC",
    );
  });

  it("pads a single-digit hour", () => {
    expect(formatDateTime("2026-01-05T04:05:00.000Z")).toBe(
      "5 Jan 2026, 04:05 UTC",
    );
  });
});
