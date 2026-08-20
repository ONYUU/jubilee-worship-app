import { expect, test } from "@playwright/test";

test("home shows the next worship and defers the video iframe", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "오직 예배를 세우는 일" })).toBeVisible();
  const heroImage = page.locator("section").first().locator("picture img");
  await expect(heroImage).toHaveAttribute(
    "src",
    /hero-home-stage-20260820-desktop-1280x720/
  );
  await expect
    .poll(() => heroImage.evaluate((image: HTMLImageElement) => image.currentSrc))
    .toMatch(
      isMobile
        ? /hero-home-stage-20260820-mobile-672x840/
        : /hero-home-stage-20260820-desktop-1280x720/
    );
  await expect(page.locator('img[src*="sundoo-jubilee-05"]')).toHaveCount(0);
  await expect(page.getByText("쥬빌리워십 찬양집회").first()).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByRole("button", { name: /영상 재생/ }).click();
  await expect(page.locator('iframe[src*="youtube-nocookie.com"]')).toHaveCount(1);
});

test("public navigation and visit information work", async ({ page }) => {
  await page.goto("/worship");
  await expect(page.getByRole("heading", { level: 1, name: "함께 예배하는 금요일" })).toBeVisible();
  await page.getByRole("link", { name: "오시는 길" }).first().click();
  await expect(page).toHaveURL(/\/visit$/);
  await expect(page.locator("#main-content").getByText("032-574-7221~5")).toBeVisible();
  await expect(page.getByRole("link", { name: /네이버 지도 열기/ })).toHaveAttribute("href", /12087641/);
});

test("mobile menu supports escape", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "메뉴 열기" });
  await trigger.click();
  await expect(page.getByRole("navigation", { name: "모바일 메뉴" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "모바일 메뉴" })).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("unknown pages show a safe 404", async ({ page }) => {
  const response = await page.goto("/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "찾으시는 페이지가 없습니다" })).toBeVisible();
});
