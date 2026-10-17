import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { describeError, reportError } from "./observability";

/*
 * What matters here is that reporting is total and quiet: it never throws, it
 * always produces something readable, and it never becomes the thing that breaks
 * a request.
 */

let logged: string[] = [];

beforeEach(() => {
  logged = [];
  vi.spyOn(console, "error").mockImplementation((line: unknown) => {
    logged.push(String(line));
  });
  delete process.env.ERROR_REPORT_URL;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ERROR_REPORT_URL;
});

describe("describeError", () => {
  it("keeps the name, message, and stack of an error", () => {
    const error = new RangeError("out of range");

    const sample = describeError(error);

    expect(sample.name).toBe("RangeError");
    expect(sample.message).toBe("out of range");
    expect(sample.stack).toContain("RangeError");
  });

  it("names a thrown string", () => {
    expect(describeError("nope")).toEqual({
      name: "UnknownError",
      message: "nope",
    });
  });

  it("serializes a thrown object", () => {
    expect(describeError({ status: 500 })).toEqual({
      name: "UnknownError",
      message: '{"status":500}',
    });
  });

  it("survives a thrown value that cannot be serialized", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(describeError(circular).message).toBeTypeOf("string");
  });

  it("survives undefined", () => {
    expect(describeError(undefined).message).toBe("undefined");
  });
});

describe("reportError", () => {
  it("writes one JSON line, carrying the error and the call site's context", () => {
    const report = reportError(new Error("boom"), { where: "submitResponse" });

    expect(logged).toHaveLength(1);
    expect(JSON.parse(logged[0])).toEqual({
      name: "Error",
      message: "boom",
      stack: expect.any(String),
      context: { where: "submitResponse" },
      at: expect.any(String),
    });
    // The returned report is the same thing that was logged, so a caller under
    // test can assert on it without reaching into the log.
    expect(JSON.parse(logged[0])).toEqual(report);
  });

  it("records the time as ISO 8601", () => {
    expect(reportError(new Error("boom")).at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it("forwards to ERROR_REPORT_URL when one is set", async () => {
    process.env.ERROR_REPORT_URL = "https://errors.example/collect";
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null));
    vi.stubGlobal("fetch", fetchSpy);

    reportError(new Error("boom"), { formId: "form1" });
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://errors.example/collect");
    expect(JSON.parse(init.body).context).toEqual({ formId: "form1" });
  });

  it("does not reach the network when no endpoint is configured", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    reportError(new Error("boom"));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not throw when the forward fails", async () => {
    process.env.ERROR_REPORT_URL = "https://errors.example/collect";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network is down")),
    );

    expect(() => reportError(new Error("boom"))).not.toThrow();
    // Let the rejected forward settle; nothing may escape it.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
