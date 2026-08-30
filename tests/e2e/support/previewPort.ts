export const DEFAULT_PREVIEW_PORT = 4173;

export function parsePreviewPort(
  raw: string | undefined = process.env.PLAYWRIGHT_PREVIEW_PORT,
): number {
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_PREVIEW_PORT;
  }

  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(
      `PLAYWRIGHT_PREVIEW_PORT must be an integer 1..65535, got ${JSON.stringify(raw)}`,
    );
  }

  return port;
}

export function previewOrigin(port = parsePreviewPort()): string {
  return `http://127.0.0.1:${port}`;
}
