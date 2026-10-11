import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { renderResumeBuffer } from "../src/lib/resume-renderer";
import { portfolioSchema } from "../src/lib/portfolio";

// Without an input file, export the actual public snapshot through the application.
// An explicit JSON input produces a private, offline draft for layout review.
const input = process.argv[2];
const output = resolve(
  process.argv[3] ??
    (input
      ? "output/pdf/Parikshit_Abuj_Resume_Draft_A4.pdf"
      : "output/pdf/Parikshit_Abuj_Resume_A4.pdf"),
);
let bytes: Buffer;
if (input) {
  const content = portfolioSchema.parse(
    JSON.parse(await readFile(resolve(input), "utf8")),
  );
  bytes = await renderResumeBuffer(content);
} else {
  const url = new URL(
    "/api/resume",
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000",
  );
  const response = await fetch(url);
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("application/pdf")
  ) {
    throw new Error(
      `Resume download failed (${response.status}). Start the app and publish a valid draft first.`,
    );
  }
  bytes = Buffer.from(await response.arrayBuffer());
}
if (bytes.subarray(0, 5).toString() !== "%PDF-")
  throw new Error("The export is not a PDF.");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, bytes);
console.log(
  `${input ? "Private draft" : "Published resume"} exported to ${output}`,
);
