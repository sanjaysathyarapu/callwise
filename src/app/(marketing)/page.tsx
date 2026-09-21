import Link from "next/link";
import { BarChart3, Code2, FileUp, MessagesSquare, Mic, Phone, ShieldCheck, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth/config";

const steps = [
  { icon: Upload, title: "Add your knowledge", body: "Upload PDFs, Word docs or paste text. Callwise indexes everything for instant lookup." },
  { icon: MessagesSquare, title: "Test it your way", body: "Chat or talk to your assistant and check every answer against your own documents." },
  { icon: Code2, title: "Put it in front of customers", body: "Share a link, drop a chat bubble on your site, or give customers a phone number." },
];

const features = [
  { icon: FileUp, title: "Answers from your documents", body: "Grounded in what you upload, and it says so when it doesn't know instead of guessing." },
  { icon: Mic, title: "Chat and voice", body: "Customers can type or speak. Replies can be read aloud for voice questions." },
  { icon: Phone, title: "Phone support", body: "A dedicated number that answers calls with the same knowledge and remembers the conversation." },
  { icon: BarChart3, title: "See every conversation", body: "Read transcripts across chat, voice and phone, and track activity over time." },
  { icon: Code2, title: "Embed anywhere", body: "One script tag for a floating chat bubble, or a public page you can share." },
  { icon: ShieldCheck, title: "Built with guardrails", body: "Rate limiting, signed phone webhooks and input limits protect your assistant and your bill." },
];

export default async function HomePage() {
  const session = await auth();
  const authed = Boolean(session?.user);

  return (
    <div className="flex flex-col">
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-20 text-center md:py-28">
        <Badge variant="secondary">AI support for small businesses</Badge>
        <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Customer support that already knows your business</h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Upload your policies and FAQs. Callwise turns them into an assistant that answers customers by chat, voice and phone.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={authed ? "/assistants" : "/signup"} className={buttonVariants({ size: "lg" })}>
            {authed ? "Go to your assistants" : "Create your assistant"}
          </Link>
          <Link href="/demo" className={buttonVariants({ size: "lg", variant: "outline" })}>
            Try the live demo
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-16">
        <h2 className="mb-6 text-center text-sm font-medium uppercase tracking-wide text-muted-foreground">How it works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <Card key={title}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/40 py-16">
        <div className="mx-auto grid w-full max-w-5xl gap-8 px-6 md:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col gap-2">
              <Icon className="size-5 text-muted-foreground" />
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-4xl gap-4 px-6 py-16 md:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold">Free</h3>
            <p className="text-sm text-muted-foreground">Everything you need to put an assistant on your website.</p>
            <ul className="flex flex-col gap-1.5 text-sm">
              <li>Unlimited testing</li>
              <li>Chat and browser voice</li>
              <li>Public link and website chat bubble</li>
              <li>Conversation history</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-primary">
          <CardContent className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              Premium <Badge>Phone</Badge>
            </h3>
            <p className="text-sm text-muted-foreground">Everything in Free, plus a phone line for your business.</p>
            <ul className="flex flex-col gap-1.5 text-sm">
              <li>A dedicated phone number</li>
              <li>Calls answered from your documents</li>
              <li>Call transcripts and caller numbers</li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
