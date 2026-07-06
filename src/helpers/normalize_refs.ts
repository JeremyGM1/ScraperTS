function normalizeRefs(input: unknown): string[] {
  if (!input) {
    return [];
  }

  if (typeof input === "string") {
    return input
      .split(/[\n,;]+/)
      .map((value) => value.trim())
      .filter(Boolean);
  }

  if (Array.isArray(input)) {
    return input
      .flatMap((value) => (typeof value === "string" ? value.split(/[\n,;]+/) : []))
      .map((value) => value.trim())
      .filter(Boolean);
  }

  if (typeof input === "object") {
    const candidate = input as { ref_id?: string; ref_ids?: string[] | string; refs?: string[] | string };
    const values = [candidate.ref_id, candidate.ref_ids, candidate.refs]
      .flatMap((value) => {
        if (typeof value === "string") {
          return value.split(/[\n,;]+/);
        }

        if (Array.isArray(value)) {
          return value;
        }

        return [];
      })
      .map((value) => value.trim())
      .filter(Boolean);

    return [...new Set(values)];
  }

  return [];
}

export { normalizeRefs };