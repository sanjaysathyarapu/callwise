import crypto from "crypto";

export function makeSlug(name: string) {
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "assistant";
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}
