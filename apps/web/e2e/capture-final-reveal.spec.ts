import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const GUESTS = [
  { role: "chief", label: "Guest 1", route: "/guest/1" },
  { role: "vice-chancellor", label: "Guest 2", route: "/guest/2" },
  { role: "dean", label: "Guest 3", route: "/guest/3" },
] as const;

const RESOLUTIONS = [
  { name: "1080p", width: 1920, height: 1080 },
  { name: "900p", width: 1600, height: 900 },
  { name: "1366p", width: 1366, height: 768 },
  { name: "720p", width: 1280, height: 720 },
  { name: "1024p", width: 1024, height: 768 },
] as const;

const ARTIFACT_DIR = "C:/Users/Shen/.gemini/antigravity/brain/ae2d03df-d9c6-4911-aa71-24d11476ef0a";

async function release(page: Page) {
  await page.evaluate(async () => {
    await fetch("/api/guest-sessions/release", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  });
}

test("capture final launch reveal at all 5 target resolutions", async ({ browser }) => {
  test.setTimeout(90_000);
  const contexts: BrowserContext[] = [];
  const displayContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  contexts.push(displayContext);
  const display = await displayContext.newPage();

  try {
    await display.goto("/");
    await display.getByRole("button", { name: "Begin activations" }).click();
    await expect(display.locator("[data-display-view=waiting-for-activations]")).toBeVisible();

    const tablets: Page[] = [];
    for (const guest of GUESTS) {
      const context = await browser.newContext();
      contexts.push(context);
      const page = await context.newPage();
      tablets.push(page);
      await page.goto("/guest");
      await page.getByRole("button", { name: new RegExp(guest.label) }).click();
      await expect(page).toHaveURL(new RegExp(`${guest.route}$`));
    }

    // Activate all 3 guests
    await tablets[0]!.getByRole("button", { name: "Activate with keyboard" }).click();
    await tablets[1]!.getByRole("button", { name: "Activate with keyboard" }).click();
    await tablets[2]!.getByRole("button", { name: "Activate with keyboard" }).click();

    // Wait for display to transition to 'opened'
    await expect(display.locator("[data-display-view=opened]")).toBeVisible({ timeout: 25_000 });

    // Ensure the FIT 25 anniversary image is fully loaded
    const anniversaryImg = display.locator("img[alt*='FIT 25th Anniversary']");
    await expect(anniversaryImg).toBeVisible();
    await display.waitForFunction(() => {
      const img = document.querySelector("img[alt*='FIT 25th Anniversary']") as HTMLImageElement;
      return img && img.complete && img.naturalWidth > 0;
    });

    // Capture screenshots at all 5 target resolutions
    for (const res of RESOLUTIONS) {
      await display.setViewportSize({ width: res.width, height: res.height });
      await display.waitForTimeout(600);
      await display.screenshot({
        path: `${ARTIFACT_DIR}/display-05-launch-reveal-${res.name}.png`,
      });
    }
  } finally {
    for (const context of contexts) {
      const pages = context.pages();
      for (const page of pages) {
        await release(page).catch(() => undefined);
      }
      await context.close();
    }
  }
});
