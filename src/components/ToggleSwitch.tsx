import { cn } from "@/lib/utils";

export function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative h-8 w-14 rounded-full transition",
        checked ? "bg-glow-500" : "bg-ink-600",
        disabled && "opacity-50",
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition",
          checked ? "left-7" : "left-1",
        )}
      />
    </button>
  );
}
