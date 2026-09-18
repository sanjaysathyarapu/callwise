export class UnsupportedFileError extends Error {}

export const ACCEPTED_EXTENSIONS = [".txt", ".md", ".markdown", ".csv", ".pdf", ".docx"];
export const MAX_FILE_BYTES = 4 * 1024 * 1024; // stays under Vercel's 4.5 MB request limit

function normalize(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (/\.(txt|md|markdown|csv)$/.test(name)) {
    return normalize(new TextDecoder("utf-8").decode(buffer));
  }

  if (name.endsWith(".pdf")) {
    const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await pdfText(pdf, { mergePages: true });
    return normalize(text);
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return normalize(value);
  }

  throw new UnsupportedFileError(`Unsupported file type. Use ${ACCEPTED_EXTENSIONS.join(", ")}.`);
}
