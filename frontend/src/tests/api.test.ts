import { describe, it, expect } from "vitest";
import { resolveApiBase } from "../services/api";

describe("API Base URL Resolution", () => {
  it("defaults to /api when environment variable is unset or empty", () => {
    expect(resolveApiBase("")).toBe("/api");
    expect(resolveApiBase("   ")).toBe("/api");
  });

  it("appends /api when domain is supplied without /api", () => {
    expect(resolveApiBase("https://api.solarscope.app")).toBe("https://api.solarscope.app/api");
    expect(resolveApiBase("https://backend.onrender.com")).toBe("https://backend.onrender.com/api");
  });

  it("preserves /api when explicitly included in URL", () => {
    expect(resolveApiBase("https://api.solarscope.app/api")).toBe("https://api.solarscope.app/api");
  });

  it("strips trailing slashes correctly", () => {
    expect(resolveApiBase("https://api.solarscope.app/")).toBe("https://api.solarscope.app/api");
    expect(resolveApiBase("https://api.solarscope.app/api/")).toBe("https://api.solarscope.app/api");
    expect(resolveApiBase("https://api.solarscope.app///")).toBe("https://api.solarscope.app/api");
  });
});
