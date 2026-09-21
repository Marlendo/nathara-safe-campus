import { classNames } from "../utils/validation";

export default function Card({ className = "", children }) {
  return (
    <div
      className={classNames(
        "rounded-xl border border-navy/10 bg-white p-6 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}