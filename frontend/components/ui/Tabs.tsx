"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// A simple controlled tabs implementation

interface TabsContextProps {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextProps | null>(null)

export function Tabs({ 
  defaultValue, 
  value, 
  onValueChange, 
  className, 
  children 
}: { 
  defaultValue?: string; 
  value?: string; 
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [tabValue, setTabValue] = React.useState(defaultValue || "")

  // Controlled/uncontrolled: when `value` is provided it always wins, so there's
  // no need to mirror it into state via an effect — just read it directly.
  const currentValue = value !== undefined ? value : tabValue

  const handleValueChange = React.useCallback((newValue: string) => {
    setTabValue(newValue)
    onValueChange?.(newValue)
  }, [onValueChange])

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("inline-flex h-10 items-center justify-center rounded-md bg-(--muted) p-1 text-(--muted-foreground)", className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({ className, value, children }: { className?: string; value: string; children: React.ReactNode }) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsTrigger must be used within Tabs")
  
  const isSelected = context.value === value
  
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      onClick={() => context.onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-(--background) transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isSelected 
          ? "bg-(--background) text-(--foreground) shadow-sm" 
          : "hover:bg-(--background)/50 hover:text-(--foreground)",
        className
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({ className, value, children }: { className?: string; value: string; children: React.ReactNode }) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsContent must be used within Tabs")
  
  if (context.value !== value) return null
  
  return (
    <div
      role="tabpanel"
      className={cn(
        "mt-2 ring-offset-(--background) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) focus-visible:ring-offset-2",
        className
      )}
    >
      {children}
    </div>
  )
}
