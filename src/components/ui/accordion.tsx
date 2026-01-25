"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionProps {
  children: React.ReactNode;
  className?: string;
  type?: "single" | "multiple";
  collapsible?: boolean;
}

export function Accordion({ children, className }: AccordionProps) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}

interface AccordionItemProps {
  children: React.ReactNode;
  className?: string;
  value: string;
}

export function AccordionItem({ children, className, value }: AccordionItemProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn("border-b border-white/5", className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            isOpen,
            setIsOpen: () => setIsOpen(!isOpen)
          });
        }
        return child;
      })}
    </div>
  );
}

export function AccordionTrigger({
  children,
  className,
  isOpen,
  setIsOpen
}: {
  children: React.ReactNode;
  className?: string;
  isOpen?: boolean;
  setIsOpen?: () => void;
}) {
  return (
    <button
      onClick={setIsOpen}
      className={cn(
        "flex w-full items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180 text-left",
        className
      )}
    >
      {children}
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-200",
          isOpen && "rotate-180"
        )}
      />
    </button>
  );
}

export function AccordionContent({
  children,
  className,
  isOpen
}: {
  children: React.ReactNode;
  className?: string;
  isOpen?: boolean;
}) {
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className={cn("pb-4 pt-0 text-muted-foreground", className)}>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
