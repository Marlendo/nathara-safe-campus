import { useEffect, useState } from "react";
import Card from "../../components/Card";
import api from "../../services/api";

const ICONS = {
  emergency: "🚨",
  protection: "🛡",
  medical: "🏥",
  psychosocial: "💬",
  legal: "⚖",
  shelter: "🏠",
};

export default function SupportServices() {
  const [type, setType] = useState("");
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .getServices(type)
      .then((d) => mounted && setServices(d.services))
      .catch(() => mounted && setServices([]))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [type]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-navy">Support directory</h1>
      <p className="mt-2 text-sm text-ink/60">
        Demo services shown for the POC — fictional organizations.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {["", "emergency", "protection", "medical", "psychosocial", "legal", "shelter"].map(
          (t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                type === t
                  ? "bg-navy text-white"
                  : "border border-navy/15 bg-white text-ink/60 hover:bg-canvas"
              }`}
            >
              {t ? t[0].toUpperCase() + t.slice(1) : "All"}
            </button>
          )
        )}
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-ink/50">Loading…</p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {services.map((svc) => (
            <Card key={svc.id}>
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden>
                  {ICONS[svc.service_type] || "🛟"}
                </span>
                <div>
                  <h2 className="font-bold text-navy">{svc.name}</h2>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-protect">
                    {svc.service_type}
                  </p>
                  <p className="mt-1 text-sm text-ink/60">{svc.description}</p>
                  <p className="mt-2 text-sm">
                    <span className="font-semibold">Call:</span> {svc.phone || "—"}
                  </p>
                  {svc.availability && (
                    <p className="text-xs text-ink/50">Available {svc.availability}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {services.length === 0 && (
            <p className="text-sm text-ink/50">No services found for this filter.</p>
          )}
        </div>
      )}
    </div>
  );
}