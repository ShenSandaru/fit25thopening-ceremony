import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const GUESTS = [
  { role: "chief", label: "Guest 1", route: "/guest/1" },
  { role: "vice-chancellor", label: "Guest 2", route: "/guest/2" },
  { role: "dean", label: "Guest 3", route: "/guest/3" },
] as const;

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

test("three guests open the ceremony on the display", async ({ browser }) => {
  test.setTimeout(45_000);
  const contexts: BrowserContext[] = [];
  const displayContext = await browser.newContext();
  contexts.push(displayContext);
  const display = await displayContext.newPage();

  try {
    await display.goto("/");
    await display.getByRole("button", { name: "Begin activations" }).click();
    await display.getByRole("button", { name: "Enable presentation" }).first().click();
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

    await tablets[0]!.getByRole("button", { name: "Activate with keyboard" }).click();
    await expect(display.locator("[data-guest=chief]")).toHaveAttribute(
      "data-guest-status",
      "activated",
    );
    await tablets[1]!.getByRole("button", { name: "Activate with keyboard" }).click();
    await tablets[2]!.getByRole("button", { name: "Activate with keyboard" }).click();

    await expect(
      display.locator("[data-display-view=all-activated], [data-display-view=countdown]"),
    ).toBeVisible();
    await display.reload();
    await expect(
      display.locator(
        "[data-display-view=all-activated], [data-display-view=countdown], [data-display-view=opened]",
      ),
    ).toBeVisible();
    await expect(display.locator("[data-display-view=opened]")).toBeVisible({ timeout: 20_000 });
    await expect(
      display.getByRole("heading", { name: "FIT EXPO INAUGURATION CEREMONY" }),
    ).toBeVisible();

    await tablets[0]!.reload();
    await expect(tablets[0]!.getByText("The FIT EXPO is open.")).toBeVisible();
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
