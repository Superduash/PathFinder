import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className = "", ...props }, ref) => (
  <SwitchPrimitive.Root
    className={`peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface-2 ${className}`}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb
      className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-text transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5 data-[state=checked]:bg-bg`}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };

