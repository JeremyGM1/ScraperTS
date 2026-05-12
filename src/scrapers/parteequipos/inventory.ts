import { Locator, Page } from "playwright";

export async function getInventory(page: Page, productIndex: number): Promise<number> {
    let inventory = 0;

    const product = page.locator("ol.product-items > li.product-item").nth(productIndex);

    const inventoryButton = product.locator("a.btn-show-inventory");

    if (await inventoryButton.count() > 0) {        
        const sku = await inventoryButton.getAttribute("data-sku");

        await inventoryButton.click();

        const modal = page.locator(".modal-popup._show .inventory-popup-content");

        await modal.waitFor({ state: "visible" });

        await page.waitForTimeout(1000);

        const quantities = await modal.locator(".row-per-office-popup .label-qty").allTextContents();

        inventory = quantities.reduce((sum, value) => {
            return sum + (parseInt(value.trim()) || 0);
        }, 0);

        console.log(`[Parte Equipos] SKU ${sku} inventory: ${inventory}`);

        const closeButton = page.locator(".modal-popup._show button.action-close[data-role='closeBtn']");

        if (await closeButton.isVisible().catch(() => false)) {
            await closeButton.click();
            await page.waitForTimeout(500);
        }
    }
    return inventory;
}