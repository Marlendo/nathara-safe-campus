import { Link } from "react-router-dom";
import Card from "../../components/Card";

export default function Home() {
  return (
    <div>
      <section className="py-6">
        <h1 className="text-3xl font-bold text-navy sm:text-4xl">
          Safe reporting.
          <br />
          <span className="text-safety">Clear protection pathways.</span>
        </h1>
        <p className="mt-4 max-w-xl text-ink/70">
          If you are experiencing threats, violence, or abuse, report it safely and see
          what help is available — with or without revealing your identity.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-navy">I need help</h2>
          <p className="text-sm text-ink/60">
            Start the guided report. It takes about two minutes and can be done
            anonymously.
          </p>
          <Link
            to="/report"
            className="mt-auto inline-flex w-full justify-center rounded-lg bg-safety px-4 py-3 text-sm font-bold text-white hover:bg-safety/90"
          >
            I NEED HELP
          </Link>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-navy">Report a safety concern</h2>
          <p className="text-sm text-ink/60">
            Reporting on behalf of someone else is welcome too. You decide how much to
            share.
          </p>
          <Link
            to="/report"
            className="mt-auto inline-flex w-full justify-center rounded-lg border border-navy/20 px-4 py-3 text-sm font-bold text-navy hover:bg-canvas"
          >
            REPORT A SAFETY CONCERN
          </Link>
        </Card>

        <Card className="flex flex-col gap-4 sm:col-span-2">
          <h2 className="text-lg font-bold text-navy">Find support</h2>
          <p className="text-sm text-ink/60">
            Browse emergency, protection, medical, and psychosocial services in the
            support directory.
          </p>
          <Link
            to="/support"
            className="mt-auto inline-flex w-full justify-center rounded-lg border border-protect/30 px-4 py-3 text-sm font-bold text-protect hover:bg-protect/10"
          >
            FIND SUPPORT
          </Link>
        </Card>
      </section>

      <p className="mt-8 text-center text-xs text-ink/50">
        Your privacy matters. You can submit a report anonymously — no name, phone, or
        email required.
      </p>
    </div>
  );
}