// Pure text-splitting helpers (no imports), so scripts can load them directly.

// Naive fixed-size chunker with overlap — good enough for short support docs/FAQs.
export function chunkText(text: string, chunkSize = 800, overlap = 150): string[] {
  // With overlap >= chunkSize the window never advances and the loop below runs forever.
  if (!(chunkSize > 0 && overlap >= 0 && overlap < chunkSize)) {
    throw new RangeError("chunkText requires chunkSize > 0 and 0 <= overlap < chunkSize");
  }
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end).trim());
    if (end === text.length) break;
    start = end - overlap;
  }
  return chunks.filter(Boolean);
}

const HEADING = /^(#{1,6})\s+(.*\S)\s*$/;

// Splits one oversized block on sentence boundaries, and a oversized sentence on words.
function splitLong(block: string, limit: number): string[] {
  const sentences = block.split(/(?<=[.!?])\s+/).flatMap((s) => {
    if (s.length <= limit) return [s];
    const words = s.split(/\s+/);
    const parts: string[] = [];
    let line = "";
    for (const w of words) {
      // A single token longer than the limit is cut so no piece can exceed it.
      for (let i = 0; i < w.length; i += limit) {
        const piece = w.slice(i, i + limit);
        if (line && line.length + 1 + piece.length > limit) {
          parts.push(line);
          line = piece;
        } else {
          line = line ? `${line} ${piece}` : piece;
        }
      }
    }
    if (line) parts.push(line);
    return parts;
  });
  return packPieces(sentences, limit, " ");
}

function packPieces(pieces: string[], limit: number, joiner: string): string[] {
  const out: string[] = [];
  let current = "";
  for (const piece of pieces) {
    if (current && current.length + joiner.length + piece.length > limit) {
      out.push(current);
      current = piece;
    } else {
      current = current ? `${current}${joiner}${piece}` : piece;
    }
  }
  if (current) out.push(current);
  return out;
}

// Structure-aware chunker. Splits on Markdown headings and blank-line paragraphs, then on
// sentences only when a paragraph is too long, and never merges text from different
// sections. Every chunk from a section starts with its heading path ("Title > Section"),
// so a chunk still says what it is about when it is retrieved on its own.
// No chunk is longer than maxChars (heading prefix included).
export function chunkStructured(text: string, maxChars = 800): string[] {
  if (!(maxChars > 0)) throw new RangeError("chunkStructured requires maxChars > 0");

  const sections: { headings: string[]; paragraphs: string[] }[] = [{ headings: [], paragraphs: [] }];
  const path: string[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    const joined = paragraph.join(" ").replace(/\s+/g, " ").trim();
    if (joined) sections[sections.length - 1].paragraphs.push(joined);
    paragraph = [];
  };

  for (const rawLine of text.replace(/\r\n?/g, "\n").split("\n")) {
    const heading = HEADING.exec(rawLine);
    if (heading) {
      flush();
      const level = heading[1].length;
      path.length = Math.min(path.length, level - 1);
      path[level - 1] = heading[2];
      sections.push({ headings: path.filter(Boolean), paragraphs: [] });
    } else if (rawLine.trim() === "") {
      flush();
    } else {
      paragraph.push(rawLine.trim());
    }
  }
  flush();

  const chunks: string[] = [];
  for (const section of sections) {
    if (section.paragraphs.length === 0) continue;
    let prefix = section.headings.join(" > ");
    // A heading path that eats most of the budget would leave no room for text.
    if (prefix.length > maxChars / 2) prefix = prefix.slice(0, Math.floor(maxChars / 2));
    const head = prefix ? `${prefix}\n` : "";
    const budget = Math.max(1, maxChars - head.length);

    const pieces = section.paragraphs.flatMap((p) => (p.length > budget ? splitLong(p, budget) : [p]));
    for (const body of packPieces(pieces, budget, "\n\n")) chunks.push(`${head}${body}`);
  }
  return chunks;
}
