import { useNavigate } from "react-router-dom";

/**
 * Immediate escape hatch shown on every sensitive page.
 * Navigates instantly to a neutral page that reveals nothing.
 */
export default function QuickExit() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      aria-label="Quick exit — leave this page immediately"
      onClick={() => navigate("/about", { replace: true })}
      className="fixed top-3 right-3 z-50 rounded-md bg-navy px-3 py-1.5 text-xs font-bold tracking-wide text-white shadow transition-colors hover:bg-danger"
    >
      ⚡ QUICK EXIT
    </button>
  );
}