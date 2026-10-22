import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://mlookis21-netizen.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metode tidak didukung." }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Silakan masuk untuk menggunakan Live Chat." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") ??
    (() => {
      try { return JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default; }
      catch { return ""; }
    })();
  const secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    (() => {
      try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default; }
      catch { return ""; }
    })();
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return json({ error: "Konfigurasi backend Supabase belum lengkap." }, 500);
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "Sesi tidak valid. Silakan masuk kembali." }, 401);
  const user = userData.user;

  let input: { conversation_id?: string; topic?: string; message?: string };
  try { input = await req.json(); }
  catch { return json({ error: "Format pesan tidak valid." }, 400); }

  const message = typeof input.message === "string" ? input.message.trim() : "";
  const topic = typeof input.topic === "string" ? input.topic.trim().slice(0, 80) : "Pertanyaan umum";
  if (!message || message.length > 1200) return json({ error: "Pesan wajib diisi dan maksimal 1.200 karakter." }, 400);

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let conversationId = input.conversation_id;
  if (conversationId) {
    const { data: conversation, error } = await admin
      .from("support_conversations")
      .select("id,user_id,status")
      .eq("id", conversationId)
      .maybeSingle();
    if (error) return json({ error: "Gagal memeriksa percakapan." }, 500);
    if (!conversation || conversation.user_id !== user.id) return json({ error: "Percakapan tidak ditemukan." }, 404);
    if (conversation.status === "closed") return json({ error: "Percakapan ini sudah ditutup. Mulai percakapan baru." }, 409);
  } else {
    const { data: created, error } = await admin
      .from("support_conversations")
      .insert({ user_id: user.id, topic: topic || "Pertanyaan umum", status: "open" })
      .select("id")
      .single();
    if (error || !created) return json({ error: "Tidak dapat membuat percakapan." }, 500);
    conversationId = created.id;
  }

  const { count, error: countError } = await admin
    .from("support_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("sender_type", "customer")
    .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());
  if (countError) return json({ error: "Gagal memeriksa batas pesan." }, 500);
  if ((count ?? 0) >= 10) return json({ error: "Batas sementara tercapai: maksimal 10 pesan per percakapan dalam 10 menit. Coba lagi nanti." }, 429);

  const { error: insertError } = await admin.from("support_messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    sender_type: "customer",
    body: message,
  });
  if (insertError) return json({ error: "Pesan gagal disimpan. Coba lagi." }, 500);
  await admin.from("support_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

  const { data: history, error: historyError } = await admin
    .from("support_messages")
    .select("sender_type,body,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(16);
  if (historyError) return json({ conversation_id: conversationId, saved: true, ai_replied: false, warning: "Pesan tersimpan, tetapi riwayat percakapan tidak dapat dibaca." });

  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) {
    const fallback = "Pesanmu sudah tersimpan. Balasan AI belum aktif karena pemilik situs belum mengatur OPENAI_API_KEY di Supabase Edge Function Secrets.";
    await admin.from("support_messages").insert({
      conversation_id: conversationId,
      sender_type: "system",
      body: fallback,
    });
    return json({ conversation_id: conversationId, saved: true, ai_replied: false, setup_required: true });
  }

  const model = Deno.env.get("OPENAI_MODEL") || "gpt-6-luna";
  const messages = [
    {
      role: "system",
      content: "Kamu adalah asisten bantuan IOSBET untuk sebuah prototipe katalog hiburan digital. Jawab dalam Bahasa Indonesia yang jelas, ramah, ringkas, dan langkah demi langkah. Jangan pernah meminta kata sandi, OTP, PIN, data kartu, atau data pembayaran. Jangan mengaku dapat melihat akun, mengubah data, memproses pembayaran, mengaktifkan permainan, atau menyelesaikan masalah di sistem jika tidak memiliki alat untuk melakukannya. Situs ini saat ini adalah prototipe UI; tidak ada taruhan, permainan, saldo, pembayaran, deposit, atau penarikan nyata yang diproses. Jika pengguna melaporkan masalah akun pribadi, masalah keamanan, atau hal yang membutuhkan pemeriksaan backend, jelaskan bahwa pesan akan ditinjau pemilik dan jangan mengarang jawaban. Jangan memberi saran untuk berjudi atau menjanjikan keuntungan. Jika tidak yakin, akui keterbatasan dan sarankan menunggu pemilik membalas."
    },
    ...(history || []).map((item) => ({
      role: item.sender_type === "customer" ? "user" : "assistant",
      content: item.body,
    })),
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        max_completion_tokens: 500,
        temperature: 0.3,
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("OpenAI request failed", response.status, detail.slice(0, 500));
      const fallback = "Pesanmu sudah tersimpan, tetapi AI sedang tidak tersedia. Pemilik situs dapat membalas melalui panel bantuan.";
      await admin.from("support_messages").insert({ conversation_id: conversationId, sender_type: "system", body: fallback });
      return json({ conversation_id: conversationId, saved: true, ai_replied: false, warning: "AI sedang tidak tersedia." });
    }
    const result = await response.json();
    const answer = result?.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error("OpenAI returned an empty answer");
    const { error: replyError } = await admin.from("support_messages").insert({
      conversation_id: conversationId,
      sender_type: "ai",
      body: answer.slice(0, 4000),
    });
    if (replyError) return json({ conversation_id: conversationId, saved: true, ai_replied: false, warning: "Balasan AI tidak dapat disimpan." });
    await admin.from("support_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    return json({ conversation_id: conversationId, saved: true, ai_replied: true });
  } catch (error) {
    console.error("AI support error", error instanceof Error ? error.message : "unknown error");
    return json({ conversation_id: conversationId, saved: true, ai_replied: false, warning: "Pesan tersimpan, tetapi balasan AI gagal. Pemilik dapat membalas manual." });
  }
});
