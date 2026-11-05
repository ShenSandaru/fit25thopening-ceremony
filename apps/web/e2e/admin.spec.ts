import { expect, test } from "@playwright/test";

test.describe("Admin Dashboard E2E", () => {
  test.afterEach(async ({ page }) => {
    await page.request.post("/api/event/reset", { data: {} }).catch(() => undefined);
  });

  test("loads /admin directly without login and shows ceremony overview", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /Organizer Dashboard/i })).toBeVisible();
    await expect(page.getByText("Waiting to Prepare")).toBeVisible();
    await expect(page.getByRole("button", { name: /1\. Prepare Ceremony/i })).toBeEnabled();
    await expect(page.getByRole("button", { name: /2\. Start Activation Phase/i })).toBeDisabled();
  });

  test("prepares, starts, aborts and resets ceremony via admin controls", async ({ page }) => {
    await page.goto("/admin");

    // 1. Prepare ceremony (WAITING -> READY)
    await page.getByRole("button", { name: /1\. Prepare Ceremony/i }).click();
    await expect(page.getByText("Ready for Activations")).toBeVisible();
    await expect(page.getByRole("button", { name: /2\. Start Activation Phase/i })).toBeEnabled();

    // 2. Start activation phase (READY -> COLLECTING_ACTIVATIONS)
    await page.getByRole("button", { name: /2\. Start Activation Phase/i }).click();
    await expect(page.getByText("Collecting Guest Activations")).toBeVisible();

    // 3. Abort ceremony with confirmation dialog
    await page.getByRole("button", { name: /Abort Ceremony/i }).click();
    const abortDialog = page.getByRole("dialog");
    await expect(abortDialog).toBeVisible();
    await expect(abortDialog.getByText("Emergency Abort Ceremony?")).toBeVisible();
    await abortDialog.getByRole("button", { name: "Abort Ceremony Immediately" }).click();
    await expect(page.getByText("Ceremony Aborted", { exact: true })).toBeVisible();

    // 4. Reset ceremony with confirmation dialog
    await page.getByRole("button", { name: /Reset Ceremony/i }).click();
    const resetDialog = page.getByRole("dialog");
    await expect(resetDialog).toBeVisible();
    await expect(resetDialog.getByText("Reset Ceremony Run?")).toBeVisible();
    await resetDialog.getByRole("button", { name: "Yes, Reset Ceremony" }).click();
    await expect(page.getByText("Waiting to Prepare")).toBeVisible();
  });

  test("monitors guest tablet assignment and reflects session release", async ({ browser }) => {
    const adminContext = await browser.newContext();
    const tabletContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const tabletPage = await tabletContext.newPage();

    try {
      await adminPage.goto("/admin");
      await expect(adminPage.getByRole("heading", { name: /Organizer Dashboard/i })).toBeVisible();

      // Tablet assigns Dean role
      await tabletPage.goto("/guest");
      await tabletPage.getByRole("button", { name: "Dean of Information Technology" }).click();
      await expect(tabletPage).toHaveURL(/\/guest\/dean$/);

      // Admin dashboard reflects Dean tablet assignment
      const deanCard = adminPage.locator("[data-guest-card=dean]");
      await expect(deanCard.getByText("Tablet Assigned")).toBeVisible();

      // Release Dean tablet from Admin Dashboard
      const releaseButton = adminPage
        .locator("[data-manage-role=dean]")
        .getByRole("button", { name: "Release Tablet" });
      await expect(releaseButton).toBeEnabled();
      await releaseButton.click();

      // Confirm release in modal
      const releaseDialog = adminPage.getByRole("dialog");
      await expect(releaseDialog).toBeVisible();
      await releaseDialog.getByRole("button", { name: "Release Session" }).click();

      // Tablet is now released
      await expect(deanCard.getByText("Available / Unassigned")).toBeVisible();
    } finally {
      await adminContext.close();
      await tabletContext.close();
    }
  });

  test("main display remains a dedicated presentation screen and is unaffected by admin", async ({
    browser,
  }) => {
    const displayContext = await browser.newContext();
    const adminContext = await browser.newContext();
    const displayPage = await displayContext.newPage();
    const adminPage = await adminContext.newPage();

    try {
      await displayPage.goto("/");
      await expect(displayPage.locator("main[data-display-view]")).toBeVisible();
      await expect(displayPage.getByText("Faculty of Information Technology")).toBeVisible();

      await adminPage.goto("/admin");
      await expect(adminPage.getByRole("heading", { name: /Organizer Dashboard/i })).toBeVisible();

      // Admin navigates, display remains intact
      await expect(displayPage.locator("main[data-display-view]")).toBeVisible();
    } finally {
      await displayPage.evaluate(async () => {
        await fetch("/api/guest-sessions/release", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }).catch(() => undefined);
      });
      await displayContext.close();
      await adminContext.close();
    }
  });
});
