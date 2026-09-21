import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

const h2 = "mt-8 text-lg font-semibold";
const p = "mt-2 text-sm leading-relaxed text-muted-foreground";

export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-2xl px-6 py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className={p}>Last updated September 21, 2026.</p>
      <p className={p}>
        Callwise is a portfolio project that demonstrates an AI customer-support platform. This page explains, in plain
        language, what data it handles.
      </p>

      <h2 className={h2}>What we collect</h2>
      <ul className={`${p} list-disc pl-5`}>
        <li>Account details: your name, email address and a hashed password (we never store your password itself).</li>
        <li>Content you upload: documents and text you add to an assistant, and the assistant&apos;s settings.</li>
        <li>Conversations: the messages exchanged with your assistants through chat, voice and phone, and for phone calls the caller&apos;s number.</li>
        <li>Technical data: your IP address, used briefly for rate limiting and abuse prevention.</li>
      </ul>

      <h2 className={h2}>How it is used</h2>
      <p className={p}>
        Data is used only to run the service: authenticating you, indexing your documents, generating answers, showing you
        your conversations, and protecting the service from abuse. We do not sell your data or use it for advertising.
      </p>

      <h2 className={h2}>Services that process data</h2>
      <p className={p}>
        To provide answers, your documents and the questions asked are sent to OpenAI. Phone calls are handled by Twilio.
        Data is stored in a Neon Postgres database and the site is hosted on Vercel. Each provider processes data under its
        own terms and privacy policy.
      </p>

      <h2 className={h2}>Your choices</h2>
      <p className={p}>
        You can download everything we hold about you, or permanently delete your account and all associated data, from
        Account settings under Data &amp; privacy. You can also delete individual documents, conversations and assistants at
        any time.
      </p>

      <h2 className={h2}>Cookies</h2>
      <p className={p}>
        We use a single essential cookie to keep you signed in, and a preference stored in your browser for the light or dark
        theme. There are no advertising or tracking cookies.
      </p>

      <h2 className={h2}>Contact</h2>
      <p className={p}>
        Questions or requests can be raised through the project&apos;s GitHub repository at github.com/sanjaysathyarapu/callwise.
      </p>
    </article>
  );
}
