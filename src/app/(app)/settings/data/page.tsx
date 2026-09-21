import type { Metadata } from "next";
import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccount } from "@/components/settings/DeleteAccount";

export const metadata: Metadata = { title: "Data & privacy" };

export default function DataSettingsPage() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Export your data</CardTitle>
          <CardDescription>
            Download a JSON file with your profile, assistants and their settings, documents, and every conversation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/api/account/export" download className={buttonVariants({ variant: "outline" })}>
            <Download />
            Download my data
          </a>
        </CardContent>
      </Card>
      <DeleteAccount />
    </>
  );
}
