# Setup Live Chat IOSBET

## What is already installed

- Supabase tables: `support_conversations` and `support_messages`, with RLS policies.
- Supabase Realtime publication for both support tables.
- Edge Function `support-chat`, requiring a valid signed-in user JWT.
- The GitHub Pages UI sends customer messages to the Edge Function and includes an owner inbox.
- AI secret is intentionally **not** stored in this repository.

## 1. Enable AI replies

1. Create an API key in the OpenAI API platform. API billing is separate from ChatGPT subscriptions.
2. Open the Supabase Dashboard for project `iosbet-ui-demo`.
3. Go to **Edge Functions → Secrets**.
4. Add `OPENAI_API_KEY` with the private API key as its value. Never paste this key into `index.html`, `js/app.js`, GitHub, or a public message.
5. Optionally add `OPENAI_MODEL` with value `gpt-6-luna`. If omitted, the function uses that default.
6. Save the secret. Edge Functions read the secret server-side; no redeploy is needed just to change a secret.

If the key is not configured, customer messages are still saved but the function will not generate AI answers. The owner can still answer manually.

## 2. Give your own account owner access

The admin panel is hidden unless the signed-in user's trusted **app_metadata** contains `support_admin: true`. Do not use editable user metadata for authorization.

In Supabase Dashboard, open **Authentication → Users**, select the account you own, and edit its app metadata to include:

```json
{
  "support_admin": true
}
```

If the editor shows existing app metadata, preserve the existing values and add this property instead of replacing unrelated values. Then sign out and sign back in so the refreshed session token includes the new claim.

Alternative for experienced users: in the Supabase SQL Editor, update only your own verified account (replace the placeholder email; do not run it unchanged):

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"support_admin": true}'::jsonb
where email = 'EMAIL_LOGIN_PEMILIK'
returning id, email, raw_app_meta_data;
```

Confirm that the returned row is your own account before proceeding. Never grant this claim to customer accounts.

## 3. Test the flow

1. Open the GitHub Pages site and sign in with a test customer account.
2. Go to **Live Chat**, send a non-sensitive test question, and confirm the message appears after the page reloads.
3. Confirm an AI response appears after `OPENAI_API_KEY` is configured.
4. Sign in with the owner account in a separate browser/profile. Open **Live Chat → Panel bantuan**, select the conversation, and send a manual reply.
5. Confirm the customer sees the owner's reply without reloading.
6. Test with two customer accounts and verify one cannot see the other's conversation.

## Security and operating notes

- RLS restricts customers to their own conversations; owner access uses trusted `app_metadata`.
- The OpenAI key and Supabase secret/service-role key must stay server-side.
- The Edge Function currently limits a user to 10 customer messages per 10 minutes across their conversations. This helps reduce accidental API spend but is not a full abuse-prevention service.
- Do not request passwords, OTPs, PINs, or payment details in support messages.
- AI answers can be wrong. It must not claim to have inspected accounts or completed actions it cannot perform. The owner should handle sensitive account-specific cases.
- GitHub Pages is static hosting; the database and AI logic run in Supabase.
