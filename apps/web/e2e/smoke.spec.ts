import { expect, test } from "@playwright/test";

test("home page renders with brand tokens and heading font", async ({ page }) => {
  await page.goto("/");

  const heading = page.getByRole("heading", { level: 1, name: "FIT Expo Opening Ceremony" });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveCSS("color", "rgb(27, 58, 107)");

  const fontFamily = await heading.evaluate((element) => getComputedStyle(element).fontFamily);
  expect(fontFamily).toContain("Outfit");
});
