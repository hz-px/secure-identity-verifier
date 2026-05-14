import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkerVerify } from "@/lib/submissions.functions";
import { RectangularQrFrame } from "@/components/RectangularQrFrame";

export const Route = createFileRoute("/v/$code")({
  component: VerifyPage,
  head: ({ params }) => ({
    meta: [
      { title: `Verify · ${params.code}` },
      { name: "description", content: "Verified PAH profile (login required)." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Submission = NonNullable<
  Extract<Awaited<ReturnType<typeof checkerVerify>>, { found: true }>["submission"]
>;

function VerifyPage() {
  const { code } = Route.useParams();
  const verify = useServerFn(checkerVerify);
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [s, setS] = useState<Submission | null>(null);
  const [notFound, setNotFound] = useState(false);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await verify({ data: { username: u, password: p, code } });
      if (!r.found) {
        setNotFound(true);
      } else {
        setS(r.submission);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <h1 className="text-3xl font-semibold">Not verified</h1>
          <p className="mt-2 text-sm text-muted-foreground">No profile matches code {code}.</p>
        </div>
      </main>
    );
  }

  if (!s) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <form onSubmit={onLogin} className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6">
          <h1 className="text-xl font-semibold">Checker sign in</h1>
          <p className="text-xs text-muted-foreground">
            Verifying code <span className="font-mono">{code}</span>
          </p>
          <input
            placeholder="Username"
            value={u}
            onChange={(e) => setU(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            placeholder="Password"
            value={p}
            onChange={(e) => setP(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Checking…" : "Verify"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="flex flex-wrap gap-2">
          {(s.fullName.trim().toLowerCase() === "admin admin admin"
            ? ["Verified", "Admin", "Vallekas"]
            : ["Verified"]
          ).map((label) => (
            <div key={label} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {label}
            </div>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border bg-card">
          <div className="aspect-[4/3] w-full bg-muted">
            <img src={s.photoUrl} alt={s.fullName} className="h-full w-full object-cover" />
          </div>
          <div className="p-6">
            <h1 className="text-2xl font-semibold tracking-tight">{s.fullName}</h1>
            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Row label="ID" value={s.code6} mono />
              <Row label="Created" value={new Date(s.createdAt).toLocaleString()} />
              <Row label="Username 1" value={s.username1} />
              <Row label="Username 2" value={s.username2} />
            </dl>

            {s.qrUrl && (
              <div className="mt-8 flex flex-col items-center">
                <span className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
                  Verification rMQR
                </span>
                <RectangularQrFrame src={s.qrUrl} />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
