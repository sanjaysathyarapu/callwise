import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyField } from "@/components/CopyField";
import { getOwnedAssistant } from "@/lib/data";
import { getOrigin } from "@/lib/origin";

export const metadata: Metadata = { title: "Deploy" };
export const dynamic = "force-dynamic";

export default async function DeployPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assistant = await getOwnedAssistant(id);
  const origin = await getOrigin();
  const slug = assistant.slug;

  if (!slug) {
    return <p className="text-sm text-muted-foreground">This assistant has no public link yet.</p>;
  }

  const link = `${origin}/a/${slug}`;
  const script = `<script src="${origin}/widget.js" data-assistant="${slug}" defer></script>`;
  const iframe = `<iframe src="${origin}/embed/${slug}" width="380" height="560" style="border:0;border-radius:12px" title="${assistant.name}"></iframe>`;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Public link</CardTitle>
          <CardDescription>A hosted chat page anyone can open. Share it in emails, QR codes or your bio.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <CopyField value={link} />
          <Link href={`/a/${slug}`} target="_blank" className={buttonVariants({ variant: "outline", size: "sm", className: "self-start" })}>
            <ExternalLink /> Open
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Website chat bubble</CardTitle>
          <CardDescription>
            Paste this before the closing &lt;/body&gt; tag of your site to add a floating chat button.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CopyField value={script} multiline />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inline embed</CardTitle>
          <CardDescription>Or place the chat directly inside a page, such as a Help or Contact page.</CardDescription>
        </CardHeader>
        <CardContent>
          <CopyField value={iframe} multiline />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Phone number</CardTitle>
          <CardDescription>
            {assistant.twilioNumber
              ? "Customers can call this number to talk to your assistant."
              : "Give customers a number to call. Available on the Premium plan."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assistant.twilioNumber ? (
            <CopyField value={assistant.twilioNumber} />
          ) : (
            <p className="text-sm text-muted-foreground">Not enabled on this assistant.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
