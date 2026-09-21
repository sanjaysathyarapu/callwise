import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; notice?: string }>;
}) {
  const { callbackUrl, notice } = await searchParams;
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Log in to manage your assistants.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {notice === "password-changed" && (
          <p role="status" className="rounded-md bg-muted px-3 py-2 text-sm">
            Your password was changed. Please log in with your new password.
          </p>
        )}
        <LoginForm callbackUrl={callbackUrl} />
      </CardContent>
    </Card>
  );
}
