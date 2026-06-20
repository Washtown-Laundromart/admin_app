import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export function Button({ className, asChild = false, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-500 px-4 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60", className)} {...props} />;
}
