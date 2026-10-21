# Errday native app

Native SwiftUI rebuild. Keep the legacy web/Capacitor app unchanged.
Use the root CleanUI instructions. Brand: SF Pro, dark grey, restrained violet, existing logo.
Four tabs: Home (overview), Food, Gym, Health. No invented health values in production.
Supabase Auth retains the existing account; do not change remote auth settings or database schemas without a concrete migration plan.
Never bundle a service-role, secret, or OpenAI API key. Session tokens belong in Keychain.
Local records must be scoped to the authenticated user. Health data stays on device unless the user explicitly enables sharing summaries with OpenAI in the assistant chat.
AI, product imports, Watch, widgets and clinical interpretations are not implemented by placeholder UI.

User-requested temporary mode: launch directly into an isolated local profile without initializing AuthStore. Keep existing authentication code and account records for later. Local test data lives under Errday/LocalProfile, separate from Errday/Accounts.
