# Setup Live Chat IOSBET

## What is already installed

- Supabase tables: `support_conversations` and `support_messages`, with RLS policies.
- Supabase Realtime publication for both support tables.
- Edge Function `support-chat`, requiring a valid signed-in user JWT.
- The GitHub Pages UI sends customer messages to the Edge Function and includes an owner inbox.
- AI secret is intentionally **not** stored in this repository.

## 1. FAQ otomatis tanpa API berbayar

- Edge Function `support-chat` menggunakan FAQ berbasis kata kunci yang dijalankan di Supabase.
- Tidak memerlukan `OPENAI_API_KEY`, tidak mengirim pesan ke penyedia AI eksternal, dan tidak menimbulkan biaya token API.
- FAQ mencakup pendaftaran, login, pemulihan kata sandi, email verifikasi, katalog, gangguan umum, keamanan, permintaan pemilik, dan pertanyaan tentang deposit/penarikan.
- Jika pertanyaan tidak cocok, FAQ menjelaskan bahwa pemilik dapat menindaklanjuti melalui panel.

Untuk memperbarui jawaban FAQ, edit fungsi `faqCategory` dan cabang jawaban di `supabase/functions/support-chat/index.ts`, lalu deploy ulang Edge Function `support-chat`.

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
3. Confirm a matching FAQ response appears automatically.
4. Sign in with the owner account in a separate browser/profile. Open **Live Chat → Panel bantuan**, select the conversation, and send a manual reply.
5. Confirm the customer sees the owner's reply without reloading.
6. Test with two customer accounts and verify one cannot see the other's conversation.

## Security and operating notes

- RLS restricts customers to their own conversations; owner access uses trusted `app_metadata`.
- The OpenAI key and Supabase secret/service-role key must stay server-side.
- The Edge Function currently limits a user to 10 customer messages per 10 minutes across their conversations. This is a basic abuse safeguard, not a complete anti-spam system.
- Do not request passwords, OTPs, PINs, or payment details in support messages.
- FAQ answers are fixed templates and can be incomplete or fail to match a question. It must not claim to have inspected accounts or completed actions it cannot perform. The owner should handle sensitive account-specific cases.
- GitHub Pages is static hosting; the database and FAQ logic run in Supabase.
