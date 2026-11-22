import { Link, Outlet, useLocation } from "react-router-dom";
import QuickExit from "../components/QuickExit";

/**
 * Public layout — wraps the entire reporting experience.
 * Quick Exit is always available on sensitive screens.
 */
export default function PublicLayout() {
  const { pathname } = useLocation();

  // Neutral pages don't show the Quick Exit button.
  const isNeutral = pathname === "/about";

  return (
    <div className="min-h-screen">
      {!isNeutral && <QuickExit />}

      <header className="border-b border-navy/10 bg-navy text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-xl font-bold tracking-tight">
            Nathara Safe Campus
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/report" className="hover:text-safety">
              Report
            </Link>
            <Link to="/support" className="hover:text-safety">
              Support
            </Link>
            <Link to="/case-status" className="hover:text-safety">
              Case Status
            </Link>
            <span className="h-4 w-px bg-white/20" aria-hidden="true" />
            <Link
              to="/dashboard/login"
              className="rounded-lg border border-safety/60 px-3 py-1.5 font-semibold text-safety hover:bg-safety hover:text-white"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {pathname !== "/about" && (
          <p className="mb-6 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
            Staging environment — do not submit real emergency or personal information.
          </p>
        )}
        <Outlet />
      </main>

      <footer className="mx-auto max-w-4xl px-4 pb-8 text-xs text-ink/50">
        Your privacy matters. You can submit a report anonymously — no name, phone, or
        email required.
      </footer>
    </div>
  );
}