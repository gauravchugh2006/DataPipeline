import { expect, test } from "@playwright/test";

const adminEmail = process.env.CAFE_ADMIN_EMAIL || "admin@cafecoffeeday.com";
const adminPassword = process.env.CAFE_ADMIN_PASSWORD || "admin123";

test.describe("admin console smoke", () => {
  test.skip(!process.env.CAFE_APP_URL, "Set CAFE_APP_URL to run admin smoke tests.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Dashboard" }).click();

    await page.getByLabel("Email").fill(adminEmail);
    await page.getByLabel("Password").fill(adminPassword);
    await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes("/auth/login") && response.status() === 200
      ),
      page.getByRole("button", { name: "Sign in" }).click(),
    ]);

    await page.getByRole("link", { name: "Admin" }).click();
    await expect(page.getByRole("heading", { name: /Operational Control Centre/i })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("product grid supports CRUD and export", async ({ page }) => {
    const productName = `Playwright Product ${Date.now()}`;

    await page.getByLabel("Name").first().fill(productName);
    await page.getByLabel("Category").first().fill("Testing");
    await page.getByLabel("Price (€)").first().fill("42.50");
    await page.getByRole("button", { name: "Add product" }).click();

    const productRow = page.locator("tbody tr", {
      has: page.locator("td", { hasText: productName }),
    });
    await expect(productRow).toBeVisible();

    await productRow.getByRole("button", { name: "Edit" }).click();
    await productRow.locator('input[type="number"]').fill("45.00");
    await productRow.getByRole("button", { name: "Save" }).click();
    await expect(productRow).toContainText("€45.00");

    const download = await page.waitForEvent("download", async () => {
      await page.getByRole("button", { name: /^CSV$/ }).click();
    });
    expect(download.suggestedFilename()).toContain("products-export");

    page.once("dialog", (dialog) => dialog.accept());
    await productRow.getByRole("button", { name: "Delete" }).click();
    await expect(productRow).toHaveCount(0);
  });

  test("customers and orders grids refresh and export", async ({ page }) => {
    await page.getByRole("link", { name: "Customers" }).click();
    const customerTable = page.getByRole("table");
    await expect(customerTable).toBeVisible();

    const customerDownload = await page.waitForEvent("download", async () => {
      await page.getByRole("button", { name: /^CSV$/ }).click();
    });
    expect(customerDownload.suggestedFilename()).toContain("customers-export");

    await page.getByRole("link", { name: "Orders" }).click();
    const orderTable = page.getByRole("table");
    await expect(orderTable).toBeVisible();

    const firstRow = orderTable.locator("tbody tr").first();
    await firstRow.getByRole("button", { name: "Update" }).click();

    const selects = firstRow.locator("select");
    const paymentSelect = selects.first();
    const transactionSelect = selects.nth(1);

    const originalPayment = (await paymentSelect.inputValue()) || "Pending";
    const originalTransaction = (await transactionSelect.inputValue()) || "Pending";

    const nextPayment = originalPayment === "Paid" ? "Pending" : "Paid";
    const nextTransaction = originalTransaction === "Completed" ? "Pending" : "Completed";

    await paymentSelect.selectOption(nextPayment);
    await transactionSelect.selectOption(nextTransaction);
    await firstRow.getByRole("button", { name: "Save" }).click();
    await expect(firstRow).toContainText(nextPayment);
    await expect(firstRow).toContainText(nextTransaction);

    await firstRow.getByRole("button", { name: "Update" }).click();
    await paymentSelect.selectOption(originalPayment);
    await transactionSelect.selectOption(originalTransaction || "Pending");
    await firstRow.getByRole("button", { name: "Save" }).click();
    await expect(firstRow).toContainText(originalPayment);
  });
});

