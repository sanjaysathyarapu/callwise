import { SettingsTabs } from "@/components/settings/SettingsTabs";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, security and data.</p>
      </div>
      <SettingsTabs />
      <div className="flex max-w-2xl flex-col gap-6">{children}</div>
    </div>
  );
}
