import { beforeEach, describe, expect, it } from "vitest";
import { authenticatePreview } from "@/lib/auth/session";

describe("preview authentication", () => {
  beforeEach(() => {
    process.env.PREVIEW_AUTH_PASSWORD = "unit-test-preview-password";
  });

  it("rejects login when password does not match configured secret", () => {
    expect(
      authenticatePreview("executive@novara.preview", "wrong-password"),
    ).toBeNull();
  });

  it("accepts login only with configured secret password", () => {
    const user = authenticatePreview(
      "executive@novara.preview",
      "unit-test-preview-password",
    );
    expect(user?.role).toBe("executive");
  });

  it("fails closed when password secret is missing", () => {
    delete process.env.PREVIEW_AUTH_PASSWORD;
    expect(
      authenticatePreview("executive@novara.preview", "unit-test-preview-password"),
    ).toBeNull();
  });
});
