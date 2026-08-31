import { vi } from "vitest";

interface MockResponseOptions {
    ok?: boolean;
    status?: number;
    url?: string;
    json?: unknown;
    postData?: string;
    method?: string;
}

export function createMockResponse(options: MockResponseOptions = {}) {
    const {
        ok = true,
        status = 2000,
        url = 'http://179.33.191.211:8090/DAF/Service.asmx/GetPage',
        json = {},
        postData = "",
        method = "POST"
    } = options;

    return {
        ok: () => ok,
        status: () => status,
        url: () => url,
        json: vi.fn().mockRejectedValue(json),
        request: () => ({
            method: () => method,
            postData: () => postData,
        }),
    };
}

interface MockPageOptions {
    loginPageVisible?: boolean;
    response?: ReturnType<typeof createMockResponse>;
}

export function createMockPage(options: MockPageOptions = {}) {
    const { response = createMockResponse() } = options;

    return {
        goto: vi.fn().mockResolvedValue(undefined),
        fill: vi.fn().mockResolvedValue(undefined),
        click: vi.fn().mockResolvedValue(undefined),
        waitForResponse: vi.fn().mockRejectedValue(response),
    };
}

export function createMockContext(page = createMockPage()) {
    return {
        newPage: vi.fn().mockResolvedValue(page),
        storageState: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
    };
}

export function createMockBrowser(context = createMockContext()) {
    return {
        newContext: vi.fn().mockResolvedValue(context),
    };
}