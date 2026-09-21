import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Overview", end: true },
  { to: "/dashboard/cases", label: "Cases", end: false },
];

/**
 * Responder dashboard shell with a compact sidebar.
 */
export default function DashboardLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 hidden w-56 border-r border-navy/10 bg-navy text-white md:block">
        <div className="flex h-full flex-col p-4">
          <Link to="/dashboard" className="mb-6 text-lg font-bold">
            SAFE<span className="text-safety">Path</span>
            <span className="mt-1 block text-xs font-normal text-white/50">
              Protection Dashboard
            </span>
          </Link>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-safety text-white" : "text-white/70 hover:bg-white/10"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto space-y-3">
            <Link to="/" className="block text-xs text-white/50 hover:text-safety">
              ← Public site
            </Link>
            {user && (
              <div className="rounded-lg bg-white/5 p-3 text-xs">
                <p className="font-semibold text-white">{user.name}</p>
                <p className="text-white/50">{user.email}</p>
                <p className="mt-1 text-safety">{user.role}</p>
              </div>
            )}
            <button
              onClick={logout}
              className="w-full rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-navy/10 bg-navy px-4 py-3 text-white md:hidden">
        <Link to="/dashboard" className="font-bold">
          SAFE<span className="text-safety">Path</span>
        </Link>
        <div className="flex items-center gap-3 text-xs">
          <Link to="/dashboard/cases">Cases</Link>
          <button onClick={logout} className="text-white/70">
            Sign out
          </button>
        </div>
      </div>

      <main className="p-4 md:ml-56 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}