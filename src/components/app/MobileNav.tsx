"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SidebarNav } from "./SidebarNav";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
        <Menu />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64">
          <SheetHeader>
            <SheetTitle>Callwise</SheetTitle>
          </SheetHeader>
          <div className="px-3">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
