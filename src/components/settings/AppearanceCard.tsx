"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const subscribe = () => () => {};
const options = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose how Callwise looks on this device.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {options.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            variant={mounted && theme === value ? "default" : "outline"}
            onClick={() => setTheme(value)}
            aria-pressed={mounted && theme === value}
          >
            <Icon />
            {label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
