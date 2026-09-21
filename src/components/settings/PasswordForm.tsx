"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction, signOutEverywhereAction } from "@/lib/actions/account";
import { Feedback } from "./Feedback";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>You will be signed out on all devices and asked to log in again with the new password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex max-w-md flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="current">Current password</Label>
            <Input id="current" name="current" type="password" autoComplete="current-password" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="next">New password</Label>
            <Input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required />
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
          </div>
          <Feedback state={state} />
          <Button type="submit" disabled={pending} className="self-start">
            {pending && <Loader2 className="animate-spin" />}
            {pending ? "Updating..." : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function SignOutEverywhereCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign out everywhere</CardTitle>
        <CardDescription>
          Ends every active session on all devices, including this one. Use it if you think someone else has access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signOutEverywhereAction}>
          <Button type="submit" variant="outline">
            Sign out of all devices
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
