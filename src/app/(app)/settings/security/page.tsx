import type { Metadata } from "next";
import { PasswordForm, SignOutEverywhereCard } from "@/components/settings/PasswordForm";

export const metadata: Metadata = { title: "Security settings" };

export default function SecuritySettingsPage() {
  return (
    <>
      <PasswordForm />
      <SignOutEverywhereCard />
    </>
  );
}
