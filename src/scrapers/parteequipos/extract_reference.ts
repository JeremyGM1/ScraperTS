export async function extractReference(input: string): Promise<string> {
  const match = input.trim().split(/\s+/);
  return match.length > 0 ? match[match.length - 1] : "N/A";
}