import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createSubmission } from "@/lib/submissions.functions";
import { RectangularQrFrame } from "@/components/RectangularQrFrame";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "PAH Verification — Register" },
      { name: "description", content: "Register a profile and generate a verification QR code." },
    ],
  }),
});

function fileToBase64(file: File): Promise<{ data: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = reader.result as string;
      const [meta, b64] = result.split(",");
      const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? "image/jpeg";
      resolve({ data: b64, mime });
    };
    reader.readAsDataURL(file);
  });
}

function Index() {
  const submit = useServerFn(createSubmission);
  const [fullName, setFullName] = useState("");
  const [u1, setU1] = useState("");
  const [u2, setU2] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof submit>> | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!photo) {
      setError("Please attach a photo.");
      return;
    }
    if (photo.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5 MB.");
      return;
    }
    setLoading(true);
    try {
      const { data: photoBase64, mime } = await fileToBase64(photo);
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
        throw new Error("Photo must be JPEG, PNG or WebP.");
      }
      const r = await submit({
        data: {
          fullName,
          username1: u1,
          username2: u2,
          photoBase64,
          photoMime: mime as "image/jpeg" | "image/png" | "image/webp",
          origin: window.location.origin,
        },
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-xl px-6 py-16">
          <h1 className="text-3xl font-semibold tracking-tight">Profile created</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Save this QR code. Scanning it opens the verification page.
          </p>

          <div className="mt-8 rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>ID</span>
              <span className="font-mono text-foreground">{result.code7}</span>
            </div>
            <div className="mt-6 flex justify-center">
              <RectangularQrFrame src={result.qrUrl} />
            </div>
            <div className="mt-6 flex flex-col gap-2 text-sm">
              <a className="text-primary underline" href={result.qrUrl} download={`qr-${result.code7}.png`}>
                Download QR
              </a>
              <a className="text-primary underline" href={result.verifyUrl}>
                Open verification page
              </a>
            </div>
          </div>

          <button
            onClick={() => {
              setResult(null);
              setFullName("");
              setU1("");
              setU2("");
              setPhoto(null);
            }}
            className="mt-8 text-sm text-muted-foreground underline"
          >
            Register another
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">PAH Verification</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Fill out the form to generate your verification QR code.
        </p>

        <form onSubmit={onSubmit} className="mt-10 space-y-5">
          <Field label="Full name">
            <input
              required
              maxLength={120}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
          <Field label="First username">
            <input
              required
              maxLength={80}
              value={u1}
              onChange={(e) => setU1(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
          <Field label="Second username">
            <input
              required
              maxLength={80}
              value={u2}
              onChange={(e) => setU2(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
          <Field label="Photo (JPEG / PNG / WebP, max 5 MB)">
            <input
              required
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </Field>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate verification QR"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

