import type { ButtonHTMLAttributes, ReactNode } from "react";

export type UiButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "pill" | "pillPrimary" | "icon";
  children: ReactNode;
};

function variantClass(variant: UiButtonProps["variant"]): string {
  switch (variant) {
    case "primary":
      return "ui-btn ui-btn--primary";
    case "pill":
      return "ui-btn ui-btn--pill";
    case "pillPrimary":
      return "ui-btn ui-btn--pill ui-btn--primary";
    case "icon":
      return "ui-btn ui-btn--pill ui-btn--icon";
    default:
      return "ui-btn";
  }
}

/** Token-backed button for dialogs and new UI. Toolbar keeps `.toolbar-btn` hooks. */
export function UiButton({
  variant = "default",
  className,
  type = "button",
  children,
  ...rest
}: UiButtonProps) {
  const extra = className ? ` ${className}` : "";
  return (
    <button type={type} className={`${variantClass(variant)}${extra}`} {...rest}>
      {children}
    </button>
  );
}
