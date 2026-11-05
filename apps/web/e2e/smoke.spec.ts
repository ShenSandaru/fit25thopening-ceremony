import { expect, test, type Page } from "@playwright/test";

async function releaseSession(page: Page) {
  await page.evaluate(async () => {
    await fetch("/api/guest-sessions/release", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  });
}

test.afterEach(async ({ page }) => {
  await releaseSession(page).catch(() => undefined);
});

test("display route uses faculty colours and heading font", async ({ page }) => {
  await page.goto("/");
  const heading = page.getByRole("heading", { name: "FIT Expo Opening Ceremony" });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveCSS("color", "rgb(255, 255, 255)");
  const fontFamily = await heading.evaluate(
    (element) =>
      getComputedStyle(element).fontFamily ||
      getComputedStyle(element).getPropertyValue("font-family"),
  );
  expect(fontFamily).toContain("Outfit");
  await releaseSession(page);
});

test("guest selection assigns a tablet and shows the matching designation", async ({ page }) => {
  await page.goto("/guest");
  await page.getByRole("button", { name: /Chief Guest/ }).click();
  await expect(page).toHaveURL(/\/guest\/chief$/);
  await expect(page.getByRole("heading", { name: "Chief Guest" })).toBeVisible();
  await page.getByRole("button", { name: "Release this tablet" }).click();
  await expect(page).toHaveURL(/\/guest$/);
});

test("display releases its session", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await releaseSession(page);
});
