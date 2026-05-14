import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkAdmin, checkChecker } from "./admin.server";

const PUBLIC_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";

function publicUrl(bucket: string, path: string | null) {
  if (!path) return null;
  const base = PUBLIC_URL.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

const submitSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  username1: z.string().trim().min(1).max(80),
  username2: z.string().trim().min(1).max(80),
  photoBase64: z.string().min(20).max(8_000_000),
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

    const photoBytes = Buffer.from(data.photoBase64, "base64");
    const ext = data.photoMime === "image/png" ? "png" : data.photoMime === "image/webp" ? "webp" : "jpg";
    const photoPath = `${id}.${ext}`;

    const photoUp = await supabaseAdmin.storage
      .from("photos")
      .upload(photoPath, photoBytes, { contentType: data.photoMime, upsert: false });
    if (photoUp.error) throw new Error(`Photo upload failed: ${photoUp.error.message}`);

    const verifyUrl = `${data.origin.replace(/\/$/, "")}/v/${code6}`;

    const ins = await supabaseAdmin.from("submissions").insert({
      id,
      code6,
      full_name: data.fullName,
      username1: data.username1,
      username2: data.username2,
      photo_path: photoPath,
      qr_path: null,
    });
    if (ins.error) throw new Error(ins.error.message);

    return {
      id,
      code6,
      verifyUrl,
      photoUrl: publicUrl("photos", photoPath)!,
    };
  });

const finalizeSchema = z.object({
  id: z.string().uuid(),
  qrPngBase64: z.string().min(20).max(4_000_000),
});

export const finalizeSubmissionQr = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => finalizeSchema.parse(d))
  .handler(async ({ data }) => {
    const qrBytes = Buffer.from(data.qrPngBase64, "base64");
    const qrPath = `${data.id}.png`;
    const up = await supabaseAdmin.storage
      .from("qrcodes")
      .upload(qrPath, qrBytes, { contentType: "image/png", upsert: true });
    if (up.error) throw new Error(`QR upload failed: ${up.error.message}`);

    const upd = await supabaseAdmin
      .from("submissions")
      .update({ qr_path: qrPath })
      .eq("id", data.id);
    if (upd.error) throw new Error(upd.error.message);

    return { qrUrl: publicUrl("qrcodes", qrPath)! };
  });

const checkerSchema = z.object({
  username: z.string().max(200),
  password: z.string().max(200),
  code: z.string().regex(/^\d{6}$/),
});

export const checkerVerify = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => checkerSchema.parse(d))
  .handler(async ({ data }) => {
    if (!checkChecker(data.username, data.password)) {
      throw new Error("Invalid credentials");
    }
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
        photoUrl: publicUrl("photos", row.photo_path)!,
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
    if (!checkAdmin(data.username, data.password)) {
      throw new Error("Invalid credentials");
    }
    return { ok: true };
  });

const adminDeleteSchema = adminSchema.extend({ id: z.string().uuid() });

export const adminDeleteSubmission = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => adminDeleteSchema.parse(d))
  .handler(async ({ data }) => {
    if (!checkAdmin(data.username, data.password)) throw new Error("Unauthorized");
    const { data: row, error: selErr } = await supabaseAdmin
      .from("submissions")
      .select("photo_path, qr_path")
      .eq("id", data.id)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);
    if (!row) return { ok: true };

    if (row.photo_path) await supabaseAdmin.storage.from("photos").remove([row.photo_path]);
    if (row.qr_path) await supabaseAdmin.storage.from("qrcodes").remove([row.qr_path]);

    const { error: delErr } = await supabaseAdmin
      .from("submissions")
      .delete()
      .eq("id", data.id);
    if (delErr) throw new Error(delErr.message);
    return { ok: true };
  });

export const adminListSubmissions = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => adminSchema.parse(d))
  .handler(async ({ data }) => {
    if (!checkAdmin(data.username, data.password)) throw new Error("Unauthorized");
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
      photoUrl: publicUrl("photos", r.photo_path)!,
      qrUrl: publicUrl("qrcodes", r.qr_path),
      createdAt: r.created_at,
    }));
  });
