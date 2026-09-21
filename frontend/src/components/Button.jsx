import { classNames } from "../utils/validation";

const variants = {
  primary: "bg-navy text-white hover:bg-navy-soft",
  safety: "bg-safety text-white hover:bg-safety/90",
  danger: "bg-danger text-white hover:bg-danger/90",
  protect: "bg-protect text-white hover:bg-protect/90",
  outline: "border border-navy/20 bg-white text-navy hover:bg-canvas",
  ghost: "text-navy hover:bg-canvas",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) {
  return (
    <button
      className={classNames(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}