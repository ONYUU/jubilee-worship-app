import { expect, test } from "@playwright/test";

test("sensitive form redacts raw code, stays pending, and dispatches once", async ({ page }) => {
  const serverRequests: string[] = [];
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().startsWith("http://127.0.0.1:3101/")) {
      serverRequests.push(request.postData() ?? "");
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("http://127.0.0.1:3101/");

  const code = "7M4K-9P2T-8W3X-6Y5Z-1A2B-3C4D-5E";
  const submit = page.getByRole("button", { name: "보안 전송 시험" });
  await page.getByLabel("재설치 복구 코드").fill(code);

  const pendingObservation = await page.locator("form").evaluate(async (form) => {
    const button = form.querySelector("button[type=submit]") as HTMLButtonElement;
    const startedAt = performance.now();
    let firstDisabledAt: number | null = null;
    let secondSubmitDispatched = false;

    setTimeout(() => button.click(), 0);

    while (performance.now() - startedAt < 3_000) {
      if (button.disabled && firstDisabledAt === null) {
        firstDisabledAt = performance.now();
        form.dispatchEvent(new SubmitEvent("submit", {
          bubbles: true,
          cancelable: true,
          submitter: button
        }));
        secondSubmitDispatched = true;
      }
      if (form.querySelector("[role=status]")) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    return {
      disabledDurationMs: firstDisabledAt === null ? 0 : performance.now() - firstDisabledAt,
      sawDisabled: firstDisabledAt !== null,
      secondSubmitDispatched
    };
  });

  expect(pendingObservation.sawDisabled).toBe(true);
  expect(pendingObservation.disabledDurationMs).toBeGreaterThanOrEqual(1_000);
  expect(pendingObservation.secondSubmitDispatched).toBe(true);

  const result = page.getByRole("status");
  await expect(result).toBeVisible();
  const payload = JSON.parse((await result.textContent())?.trim() ?? "{}") as {
    hasRawCode?: boolean;
    digest?: string;
  };

  expect(payload.hasRawCode).toBe(false);
  expect(payload.digest).toMatch(/^[0-9a-f]{64}$/);
  expect(await result.textContent()).not.toContain(code);
  expect(serverRequests).toHaveLength(1);
  expect(serverRequests[0]).not.toContain(code);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  await expect(submit).toBeEnabled();
});
