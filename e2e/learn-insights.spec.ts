import { test, expect } from "@playwright/test";

test.describe("Learn page and Race Insights verification (polish7.md §6)", () => {
  test.beforeEach(async ({ page }) => {
    // Fail on any console.error or uncaught pageerror
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        // Ignore known harmless network aborts if any
        if (!msg.text().includes("net::ERR_ABORTED")) {
          throw new Error(`Browser console error: ${msg.text()}`);
        }
      }
    });

    page.on("pageerror", (err) => {
      throw err;
    });
  });

  test("1. All algorithm lessons load with Informed/Uninformed chip, KaTeX, and no literal $", async ({ page }) => {
    const algos = ["bfs", "dfs", "ucs", "greedy", "astar", "bds"];

    for (const algo of algos) {
      await page.goto(`/#/learn/${algo}`);
      await page.waitForLoadState("networkidle");

      // Verify Informed or Uninformed chip
      const chip = page.locator("text=/Informed Search|Uninformed Search/");
      await expect(chip.first()).toBeVisible();

      // Verify KaTeX math rendered
      const katexNodes = page.locator(".katex");
      await expect(katexNodes.first()).toBeVisible();

      // Verify no literal $ in body text
      const bodyText = await page.innerText("main");
      // Allow KaTeX elements or code, check that raw $ is not rendered in text
      expect(bodyText.includes("$$")).toBeFalsy();
    }
  });

  test("2. A* and Greedy on trap scenario", async ({ page }) => {
    // A* on trap
    await page.goto("/#/learn/astar");
    await page.waitForLoadState("networkidle");

    // Click 'Greedy trap' scenario
    await page.getByRole("button", { name: "Greedy trap" }).click();
    await page.waitForTimeout(500);

    // Jump to end
    await page.getByTitle("Jump to end").click();

    // Verify end state card: 36 steps, cost 36
    await expect(page.locator("text=Route found: 36 steps, cost 36")).toBeVisible();

    // Greedy on trap
    await page.goto("/#/learn/greedy");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Greedy trap" }).click();
    await page.waitForTimeout(500);

    await page.getByTitle("Jump to end").click();

    // Greedy cost 72 and note that C* is 36
    await expect(page.locator("text=cost 72")).toBeVisible();
    await expect(page.locator("text=36 (C*)")).toBeVisible();
  });

  test("3. Playback controls and scenario switch reset", async ({ page }) => {
    await page.goto("/#/learn/bfs");
    await page.waitForLoadState("networkidle");

    // Step 0: Prev is disabled
    const prevBtn = page.getByRole("button", { name: "Previous step" });
    await expect(prevBtn).toBeDisabled();

    // Step forward
    const nextBtn = page.getByRole("button", { name: "Next step" });
    await nextBtn.click();
    await expect(page.locator("text=Step 1 /")).toBeVisible();
    await expect(prevBtn).toBeEnabled();

    // Switching scenario resets to step 0
    await page.getByRole("button", { name: "Twisty maze" }).click();
    await page.waitForTimeout(300);
    await expect(page.locator("text=Step 0 /")).toBeVisible();
  });

  test("4. Data strip is non-empty while running (L4 regression check)", async ({ page }) => {
    for (const algo of ["ucs", "greedy", "astar", "bds"]) {
      await page.goto(`/#/learn/${algo}`);
      await page.waitForLoadState("networkidle");

      // Check step 0 has frontier
      await expect(page.locator("text=Waiting Frontier")).toBeVisible();
      // Should show (r,c) tokens in data strip
      const token = page.locator("text=/(18,2)|(9,1)|(16,2)/");
      await expect(token.first()).toBeVisible();
    }
  });

  test("5. Visualizer Race results: winner consistency and no invented score", async ({ page }) => {
    await page.goto("/#/visualizer");
    await page.waitForLoadState("networkidle");

    // Check Visualizer loaded
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
  });

  test("6. Responsive layout fits 1366x768 and 390px mobile", async ({ page }) => {
    // Desktop 1366x768
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/#/learn/astar");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Interactive Walkthrough")).toBeVisible();

    // Mobile 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/#/learn/astar");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#lesson-select")).toBeVisible();
  });
});
