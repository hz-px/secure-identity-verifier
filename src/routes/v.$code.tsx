import { createFileRoute, notFound } from "@tanstack/react-router";
import { getSubmissionByCode } from "@/lib/submissions.functions";
import { RectangularQrFrame } from "./index";

export const Route = createFileRoute("/v/$code")({
  loader: async ({ params }) => {
    const r = await getSubmissionByCode({ data: { code: params.code } });
    if (!r.found) throw notFound();
    return r.submission;
  },
  component: VerifyPage,
  notFoundComponent: () => (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Not verified</h1>
        <p className="mt-2 text-sm text-muted-foreground">No profile matches this code.</p>
      </div>
    </main>
  ),
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Error</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </main>
  ),
  head: ({ params }) => ({
    meta: [
      { title: `Verified profile · ${params.code}` },
      { name: "description", content: "Verified PAH profile." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function VerifyPage() {
  const s = Route.useLoaderData();
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Verified
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

            <div className="mt-8 flex flex-col items-center">
              <span className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
                Verification code
              </span>
              <RectangularQrFrame src={s.qrUrl} />
            </div>
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
