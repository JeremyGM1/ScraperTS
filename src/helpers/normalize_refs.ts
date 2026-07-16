function normalizeRefs(input: string[] | string | undefined | null): string[] {
  const collectValues = (value: unknown): string[] => {
    if (!value) {
      return [];
    }

    if (typeof value === "string") {
      return value
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => collectValues(item));
    }

    return [];
  };

  const values = collectValues(input);
  return [...new Set(values)];
}

export { normalizeRefs };