import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import QRCode from "qrcode";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkAdmin } from "./admin.server";

const PUBLIC_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";

function publicUrl(bucket: string, path: string) {
  const base = PUBLIC_URL.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

const submitSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  username1: z.string().trim().min(1).max(80),
  username2: z.string().trim().min(1).max(80),
  photoBase64: z.string().min(20).max(8_000_000), // ~6MB raw
  photoMime: z.enum(["image/jpeg", "image/png", "image/webp"]),
  origin: z.string().url(),
});

async function generateUniqueCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const { data } = await supabaseAdmin
      .from("submissions")
      .select("id")
      .eq("code6", code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error("Could not generate unique code");
}

export const createSubmission = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data }) => {
    const code6 = await generateUniqueCode();
    const id = crypto.randomUUID();

    // Decode photo
    const photoBytes = Buffer.from(data.photoBase64, "base64");
    const ext = data.photoMime === "image/png" ? "png" : data.photoMime === "image/webp" ? "webp" : "jpg";
    const photoPath = `${id}.${ext}`;

    const photoUp = await supabaseAdmin.storage
      .from("photos")
      .upload(photoPath, photoBytes, { contentType: data.photoMime, upsert: false });
    if (photoUp.error) throw new Error(`Photo upload failed: ${photoUp.error.message}`);

    // Generate QR (rectangular badge rendered downstream; underlying payload is standard QR URL)
    const verifyUrl = `${data.origin.replace(/\/$/, "")}/v/${code6}`;
    const qrPng = await QRCode.toBuffer(verifyUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 512,
      color: { dark: "#0a0a0a", light: "#ffffff" },
    });
    const qrPath = `${id}.png`;
    const qrUp = await supabaseAdmin.storage
      .from("qrcodes")
      .upload(qrPath, qrPng, { contentType: "image/png", upsert: false });
    if (qrUp.error) throw new Error(`QR upload failed: ${qrUp.error.message}`);

    const ins = await supabaseAdmin.from("submissions").insert({
      id,
      code6,
      full_name: data.fullName,
      username1: data.username1,
      username2: data.username2,
      photo_path: photoPath,
      qr_path: qrPath,
    });
    if (ins.error) throw new Error(ins.error.message);

    return {
      id,
      code6,
      verifyUrl,
      photoUrl: publicUrl("photos", photoPath),
      qrUrl: publicUrl("qrcodes", qrPath),
    };
  });

export const getSubmissionByCode = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ code: z.string().regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("submissions")
      .select("*")
      .eq("code6", data.code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { found: false as const };
    return {
      found: true as const,
      submission: {
        id: row.id,
        code6: row.code6,
        fullName: row.full_name,
        username1: row.username1,
        username2: row.username2,
        photoUrl: publicUrl("photos", row.photo_path),
        qrUrl: publicUrl("qrcodes", row.qr_path),
        createdAt: row.created_at,
      },
    };
  });

const adminSchema = z.object({
  username: z.string().max(200),
  password: z.string().max(200),
});

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => adminSchema.parse(d))
  .handler(async ({ data }) => {
    const ok = checkAdmin(data.username, data.password);
    if (!ok) {
      // Generic error to avoid user-enumeration
      throw new Error("Invalid credentials");
    }
    // Issue a simple opaque token (random) — stateless: clients re-auth each list call.
    // For a closed admin tool this is fine; we re-validate on every admin server fn call.
    return { ok: true };
  });

export const adminListSubmissions = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => adminSchema.parse(d))
  .handler(async ({ data }) => {
    if (!checkAdmin(data.username, data.password)) {
      throw new Error("Unauthorized");
    }
    const { data: rows, error } = await supabaseAdmin
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows.map((r) => ({
      id: r.id,
      code6: r.code6,
      fullName: r.full_name,
      username1: r.username1,
      username2: r.username2,
      photoUrl: publicUrl("photos", r.photo_path),
      qrUrl: publicUrl("qrcodes", r.qr_path),
      createdAt: r.created_at,
    }));
  });
