function normalizeRefs(input: unknown): string[] {
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
      return value
        .flatMap((item) => collectValues(item))
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (typeof value === "object") {
      const candidate = value as Record<string, unknown>;
      const values = [
        candidate.ref_id,
        candidate.refId,
        candidate.ref_ids,
        candidate.refIds,
        candidate.refs,
        candidate.references,
        candidate.reference,
        candidate.scrapers,
        candidate.scraperNames,
        candidate.selectedScrapers,
        candidate.scraper,
      ].flatMap((entry) => collectValues(entry));

      return values.map((item) => item.trim()).filter(Boolean);
    }

    return [];
  };

  if (!input) {
    return [];
  }

  const values = collectValues(input);
  return [...new Set(values)];
}

export { normalizeRefs };