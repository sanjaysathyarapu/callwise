import type { Metadata } from "next";
import { AppearanceCard } from "@/components/settings/AppearanceCard";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { requireUser } from "@/lib/data";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const user = await requireUser();
  return (
    <>
      <ProfileForm name={user.name} email={user.email} />
      <AppearanceCard />
    </>
  );
}
