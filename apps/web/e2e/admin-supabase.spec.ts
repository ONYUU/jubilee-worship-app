import { expect, test } from "@playwright/test";

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const uploadFile = process.env.E2E_UPLOAD_FILE;

test.describe("local Supabase administrator flow", () => {
  test.skip(!email || !password, "local Supabase administrator credentials are required");
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(Boolean(isMobile), "authenticated CRUD is covered once in the desktop project");

    const response = await page.goto("/admin/login");
    expect(response?.status()).toBe(200);
    expect(response?.headers()["cache-control"]).toContain("private");
    expect(response?.headers()["cache-control"]).toContain("no-store");

    await page.getByLabel("이메일").fill(email!);
    await page.getByLabel("비밀번호").fill(password!);
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "운영 대시보드" })).toBeVisible();
  });

  test("publishes and removes a pinned announcement", async ({ page }) => {
    const slug = `e2e-notice-${Date.now()}`;
    const title = `E2E 관리자 검증 공지 ${Date.now()}`;

    await page.goto("/admin/announcements");
    await page.getByLabel("Slug").fill(slug);
    await page.getByLabel("유형").selectOption("important");
    await page.getByLabel("제목").fill(title);
    await page.getByLabel("본문").fill("로컬 Supabase 관리자 CRUD 및 공개 캐시 무효화 검증용 공지입니다.");
    await page.getByLabel("상단 고정").check();
    await page.locator('input[name="published"]').check();
    await page.getByRole("button", { name: "공지 등록" }).click();
    await expect(page.getByText("공지를 등록했습니다.")).toBeVisible();

    const publicPage = await page.context().newPage();
    await publicPage.goto("/about");
    await expect(publicPage.getByText(title)).toBeVisible();
    await publicPage.close();

    await page.reload();
    const item = page.getByRole("listitem").filter({ hasText: title });
    await expect(item).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    const deletion = page.waitForResponse(
      (response) =>
        response.url().includes("/admin/announcements") &&
        response.request().method() === "POST"
    );
    await item.getByRole("button", { name: "삭제" }).click();
    expect((await deletion).ok()).toBe(true);
    await page.reload();
    await expect(page.getByRole("listitem").filter({ hasText: title })).toHaveCount(0);

    const refreshedPublicPage = await page.context().newPage();
    await refreshedPublicPage.goto("/about");
    await expect(refreshedPublicPage.getByText(title)).toHaveCount(0);
    await refreshedPublicPage.close();
  });

  test("downgrades an unknown YouTube video to a pending draft", async ({ page }) => {
    const slug = `e2e-video-${Date.now()}`;
    const title = `E2E 미승인 영상 ${Date.now()}`;

    await page.goto("/admin/media");
    await page.getByLabel("Slug").fill(slug);
    await page.getByLabel("제목").fill(title);
    await page.getByLabel("YouTube 영상 URL").fill("https://youtu.be/abcdefghijk");
    await page.locator('input[name="published"]').check();
    await page.getByRole("button", { name: "YouTube 영상 등록" }).click();
    await expect(page.getByText(/승인된 공식 YouTube 영상 ID 목록에 없어/)).toBeVisible();

    await page.reload();
    const item = page.getByRole("listitem").filter({ hasText: title });
    await expect(item).toContainText("pending");
    await expect(item).toContainText("비공개");
    page.once("dialog", (dialog) => dialog.accept());
    const deletion = page.waitForResponse(
      (response) =>
        response.url().includes("/admin/media") && response.request().method() === "POST"
    );
    await item.getByRole("button", { name: "삭제" }).click();
    expect((await deletion).ok()).toBe(true);
    await page.reload();
    await expect(page.getByRole("listitem").filter({ hasText: title })).toHaveCount(0);
  });

  test("uploads an approved image directly to Storage and renders it", async ({ page }) => {
    test.skip(!uploadFile, "an approved local test image is required");

    await page.goto("/admin/settings");
    const upload = page.getByRole("heading", { name: "소개 이미지" }).locator("..");
    await upload.locator('input[type="file"]').setInputFiles(uploadFile!);
    await upload.getByLabel("이미지 출처·권리자").fill("쥬빌리워십 승인 전달본");
    await upload.getByLabel("대체 텍스트").fill("로컬 Storage E2E 이미지");
    await upload.getByLabel(/저작권·이용 권한/).check();
    await upload.getByLabel(/EXIF 위치·기기 정보/).check();
    await upload.getByLabel("식별 가능한 인물·미성년자 동의").selectOption("confirmed");
    await upload.getByRole("button", { name: "Storage에 직접 업로드" }).click();
    await expect(upload.getByText(/업로드했습니다/)).toBeVisible();

    await page.getByRole("button", { name: "사이트 설정 저장" }).click();
    await expect(page.getByText("사이트 설정을 저장했습니다.")).toBeVisible();

    const publicPage = await page.context().newPage();
    await publicPage.goto("/about");
    const image = publicPage.getByRole("img", { name: "로컬 Storage E2E 이미지" }).first();
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await publicPage.close();
  });
});
