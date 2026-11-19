import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyField } from "@/components/CopyField";
import { configStatus } from "@/lib/config";
import { getOwnedAssistant } from "@/lib/data";
import { getOrigin } from "@/lib/origin";
import { phoneWebhookUrl } from "@/lib/twilio";

export const metadata: Metadata = { title: "Deploy" };
export const dynamic = "force-dynamic";

export default async function DeployPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assistant = await getOwnedAssistant(id);
  const origin = await getOrigin();
  const slug = assistant.slug;
  const phoneEnabled = configStatus().phone;

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
          <CardTitle>Phone line</CardTitle>
          <CardDescription>
            {phoneEnabled
              ? "Callers reach this assistant through a Twilio number whose voice webhook points at this app."
              : "The phone line is switched off on this deployment. Browser chat and voice are unaffected."}
          </CardDescription>
        </CardHeader>
        {phoneEnabled && (
          <CardContent className="flex flex-col gap-3">
            {assistant.twilioNumber && <CopyField value={assistant.twilioNumber} />}
            <p className="text-xs text-muted-foreground">
              In the Twilio console, set the number&apos;s &quot;A call comes in&quot; webhook (HTTP POST) to:
            </p>
            <CopyField value={phoneWebhookUrl(origin, assistant.id)} />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
