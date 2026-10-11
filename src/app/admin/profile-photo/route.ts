import { ownerClient, getDraft } from "@/lib/data";
import sharp from "sharp";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const client = await ownerClient();
    const draft = await getDraft();
    if (!draft.content.profile.photoPath)
      return new Response(null, { status: 404 });
    const { data, error } = await client.storage
      .from("portfolio-media")
      .download(draft.content.profile.photoPath);
    if (error || !data) return new Response(null, { status: 404 });
    return new Response(data, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 403 });
  }
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(
    process.env.NEXT_PUBLIC_SITE_URL || request.url,
  ).origin;
  if (!origin || origin !== expectedOrigin)
    return Response.json({ error: "Invalid upload origin." }, { status: 403 });
  let client;
  try {
    client = await ownerClient();
  } catch {
    return Response.json({ error: "Owner access required." }, { status: 403 });
  }
  try {
    if (Number(request.headers.get("content-length") || 0) > 3300000)
      return Response.json(
        { error: "Use an image under 3 MB." },
        { status: 413 },
      );
    const form = await request.formData();
    const photo = form.get("photo");
    if (
      !(photo instanceof File) ||
      photo.size > 3145728 ||
      photo.size === 0 ||
      !["image/jpeg", "image/png", "image/webp"].includes(photo.type)
    )
      return Response.json(
        { error: "Use a JPEG, PNG, or WebP image under 3 MB." },
        { status: 400 },
      );
    const source = sharp(Buffer.from(await photo.arrayBuffer()), {
      limitInputPixels: 12000000,
    });
    const meta = await source.metadata();
    if (
      !["jpeg", "png", "webp"].includes(meta.format || "") ||
      (meta.pages || 1) > 1
    )
      return Response.json(
        { error: "Use a still JPEG, PNG, or WebP image." },
        { status: 400 },
      );
    const bytes = await source
      .rotate()
      .resize({
        width: 640,
        height: 640,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 88 })
      .toBuffer();
    const claims = await client.auth.getClaims();
    const path = `${claims.data!.claims.sub}/${crypto.randomUUID()}.webp`;
    const { error } = await client.storage
      .from("portfolio-media")
      .upload(path, bytes, { contentType: "image/webp", upsert: false });
    if (error)
      return Response.json(
        {
          error:
            "Upload failed. Check that the profile-media migration has been applied.",
        },
        { status: 503 },
      );
    return Response.json({ path });
  } catch {
    return Response.json(
      {
        error:
          "The image could not be decoded. Use a valid still image under 12 megapixels.",
      },
      { status: 400 },
    );
  }
}
