import { describe, it, expect, vi } from "vitest";
import { createMockBrowser, createMockContext, createMockPage, createMockResponse } from "../__mocks__/playwright";
import { run } from "./scraper";

vi.mock('../../helpers/is_logged', () => ({
    isLoginPageVisible: vi.fn().mockResolvedValue(false),
}));

describe("catekom run()", () => {
    it("returns mapped productson the happy path", async () => {
        const response = createMockResponse({
            json: {
                d: {
                    Fields: [{ Name: "Cod_Producto" }, { Name: "Cantidad"}],
                    Rows: [["6P7773", 4]],
                    TotalRowCount: 1,
                },
            },
            postData: '"6P7773"',
        });

        const page = createMockPage({ response });
        const context = createMockContext(page);
        const browser = createMockBrowser(context);

        const log = { info: vi.fn(), error: vi.fn() } as any;

        const result = await run(browser as any, "user", "pass", "6P7773", log);

        expect(result).toEqual([
            expect.objectContaining({ Referencia: "6P7773", Inventario: 4 })
        ]);
        expect(page.goto).toHaveBeenCalled();
    });

    it("throws when response is not ok", async() => {
        const response = createMockResponse({ ok: false, status: 500 });
        const page = createMockPage({ response });
        const context = createMockContext(page);
        const browser = createMockBrowser(context);
        const log = { info: vi.fn(), error: vi.fn() } as any;

        await expect(run(browser as any, "user", "pass", "6P7773", log)).rejects.toThrow();
    });

    it("returns an empty array when TotalRowCount is 0", async() => {
        const response = createMockResponse({
            json: { d: { Fields: [], Rows: [], TotalRowCount: 0 }},
        });
        const page = createMockPage({ response });
        const context = createMockContext(page);
        const browser = createMockBrowser(context);
        const log = { info: vi.fn(), error: vi.fn() } as any;

        const result = await run (browser as any, "user", "pass", "6P7773", log);
        expect(result).toEqual([]);
    });
});