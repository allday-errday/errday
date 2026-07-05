export function getWebPushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_SUBJECT ?? "mailto:hello@errday.app";

  return {
    isConfigured: Boolean(publicKey && privateKey),
    privateKey,
    publicKey,
    subject,
  };
}
