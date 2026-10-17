const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  // Pinned, so the same row renders identically on every server.
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
  timeZoneName: "short",
});

export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return dateFormatter.format(date);
}

/**
 * Date and time, for a timestamp you want to place in a sequence. Pinned to UTC
 * for the same reason `formatDate` is: the responses list is server-rendered and
 * then hydrated on the client, and the two must not disagree.
 */
export function formatDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return dateTimeFormatter.format(date);
}
