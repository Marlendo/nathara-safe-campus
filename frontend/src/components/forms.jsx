import { classNames } from "../utils/validation";

export const inputClass =
  "w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm focus:border-safety focus:outline-none focus:ring-2 focus:ring-safety/30";

export function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-ink/80">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink/50">{hint}</p>}
    </div>
  );
}

export default function Input(props) {
  return <input className={classNames(inputClass, props.className)} {...props} />;
}