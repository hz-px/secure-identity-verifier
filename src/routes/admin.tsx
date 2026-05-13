import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminDeleteSubmission, adminListSubmissions, adminLogin } from "@/lib/submissions.functions";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Row = Awaited<ReturnType<typeof adminListSubmissions>>[number];

function AdminPage() {
  const login = useServerFn(adminLogin);
  const list = useServerFn(adminListSubmissions);
  const del = useServerFn(adminDeleteSubmission);

  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [creds, setCreds] = useState<{ u: string; p: string } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ data: { username: u, password: p } });
      const data = await list({ data: { username: u, password: p } });
      setCreds({ u, p });
      setRows(data);
      setU("");
      setP("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    if (!creds) return;
    setLoading(true);
    try {
      const data = await list({ data: { username: creds.u, password: creds.p } });
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id: string, name: string) => {
    if (!creds) return;
    if (!confirm(`Delete submission for ${name}? This cannot be undone.`)) return;
    setLoading(true);
    setError(null);
    try {
      await del({ data: { username: creds.u, password: creds.p, id } });
      setRows((rs) => rs.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  if (!creds) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <form onSubmit={onLogin} className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6">
          <h1 className="text-xl font-semibold">Admin sign in</h1>
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
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">All submissions ({rows.length})</h1>
          <div className="flex gap-2">
            <button
              onClick={refresh}
              disabled={loading}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button
              onClick={() => {
                setCreds(null);
                setRows([]);
              }}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            >
              Sign out
            </button>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div key={r.id} className="overflow-hidden rounded-lg border bg-card">
              <img src={r.photoUrl} alt={r.fullName} className="h-48 w-full object-cover" />
              <div className="p-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-semibold">{r.fullName}</h2>
                  <span className="font-mono text-sm text-muted-foreground">{r.code6}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  @{r.username1} · @{r.username2}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleString()}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <img src={r.qrUrl} alt="QR" className="h-20 w-20 rounded border bg-white object-contain" />
                  <div className="flex flex-col gap-1 text-xs">
                    <a className="text-primary underline" href={r.qrUrl} target="_blank" rel="noreferrer">
                      QR image
                    </a>
                    <a className="text-primary underline" href={`/v/${r.code6}`} target="_blank" rel="noreferrer">
                      Verify page
                    </a>
                    <a className="text-primary underline" href={r.photoUrl} target="_blank" rel="noreferrer">
                      Photo
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {rows.length === 0 && !loading && (
            <p className="col-span-full text-sm text-muted-foreground">No submissions yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
