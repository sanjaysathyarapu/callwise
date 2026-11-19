export interface ConfigStatus {
  db: boolean;
  openai: boolean;
  auth: boolean;
  phone: boolean;
}

const isSet = (value: string | undefined) => typeof value === "string" && value.trim().length > 0;

// Which integrations are configured. Booleans only: this is reported publicly by
// /api/health, so it must never carry a value. OpenAI and Auth.js read their own
// variables internally, which is why they are checked here by name.
export function configStatus(env: Record<string, string | undefined> = process.env): ConfigStatus {
  return {
    db: isSet(env.DATABASE_URL),
    openai: isSet(env.OPENAI_API_KEY),
    auth: isSet(env.AUTH_SECRET),
    // The webhook refuses every request without this token, so it is the phone switch.
    phone: isSet(env.TWILIO_AUTH_TOKEN),
  };
}
