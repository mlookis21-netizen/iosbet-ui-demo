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

  const recentSince = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: userConversations, error: conversationsError } = await admin
    .from("support_conversations")
    .select("id")
    .eq("user_id", user.id);
  if (conversationsError) return json({ error: "Gagal memeriksa batas pesan." }, 500);
  const conversationIds = (userConversations || []).map((row) => row.id);
  if (conversationIds.length) {
    const { count, error: countError } = await admin
      .from("support_messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", conversationIds)
      .eq("sender_type", "customer")
      .gte("created_at", recentSince);
    if (countError) return json({ error: "Gagal memeriksa batas pesan." }, 500);
    if ((count ?? 0) >= 10) return json({ error: "Batas sementara tercapai: maksimal 10 pesan per akun dalam 10 menit. Coba lagi nanti." }, 429);
  }

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

  // Deterministic FAQ: no external AI API and no paid model calls.
  const normalized = message.toLocaleLowerCase("id-ID").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const has = (...terms: string[]) => terms.some((term) => normalized.includes(term));
  let answer = "";
  let faqCategory = "other";

  if (has("halo", "hai", "hello", "selamat pagi", "selamat siang", "selamat malam", "permisi")) {
    faqCategory = "greeting";
    answer = "Halo! 👋 Aku asisten FAQ IOSBET. Aku bisa membantu pertanyaan umum tentang akun dan cara memakai situs. Ceritakan kendalanya secara singkat—jangan kirim kata sandi, OTP, PIN, atau informasi pembayaran.";
  } else if (has("daftar", "registrasi", "buat akun", "register", "sign up")) {
    faqCategory = "registration";
    answer = "Untuk membuat akun, buka menu Masuk/Daftar lalu isi formulir dengan email yang benar dan kata sandi yang kuat. Jika diminta konfirmasi email, periksa Inbox dan folder Spam. Jangan bagikan kata sandi atau tautan konfirmasi kepada siapa pun. Jika tombol atau formulir gagal, kirim pesan errornya tanpa menyertakan data rahasia.";
  } else if (has("login", "masuk", "gagal masuk", "tidak bisa masuk", "sign in")) {
    faqCategory = "login";
    answer = "Coba periksa kembali alamat email dan kata sandi, pastikan koneksi stabil, lalu muat ulang halaman. Jika baru mendaftar, periksa apakah email konfirmasi diperlukan. Jangan kirim kata sandi atau OTP di chat. Jika masih gagal, tuliskan pesan error yang tampil agar pemilik bisa memeriksanya.";
  } else if (has("lupa password", "lupa kata sandi", "reset password", "ganti password", "ubah kata sandi")) {
    faqCategory = "password";
    answer = "Gunakan fitur pemulihan kata sandi jika tersedia pada halaman masuk. Jika pilihan itu belum muncul atau email pemulihan tidak datang, pemilik perlu memeriksa konfigurasi autentikasi. Jangan kirim kata sandi lama, OTP, atau tautan reset ke chat.";
  } else if (has("email konfirmasi", "konfirmasi email", "verifikasi email", "email tidak masuk", "email belum masuk")) {
    faqCategory = "email";
    answer = "Periksa folder Spam/Junk, pastikan alamat email saat mendaftar benar, dan tunggu beberapa menit. Jangan meminta atau membagikan kode verifikasi kepada siapa pun. Jika tetap tidak ada, pemilik perlu memeriksa pengaturan email Supabase.";
  } else if (has("deposit", "isi saldo", "top up", "topup", "penarikan", "withdraw", "tarik dana", "pembayaran", "transfer")) {
    faqCategory = "payments";
    answer = "Informasi penting: situs IOSBET yang tersedia saat ini masih berupa prototipe antarmuka. Sistem ini tidak memproses deposit, penarikan, transfer, saldo, atau pembayaran nyata. Jangan transfer uang atau mengirim detail rekening/kartu berdasarkan tampilan prototipe.";
  } else if (has("saldo", "uang saya", "transaksi")) {
    faqCategory = "balance";
    answer = "Situs ini masih berupa prototipe UI dan belum memiliki sistem saldo atau transaksi nyata. Aku tidak bisa memeriksa atau mengubah saldo. Jangan kirim informasi keuangan; jika kamu melihat tampilan yang membingungkan, jelaskan bagian halamannya saja.";
  } else if (has("game", "permainan", "katalog", "gambar tidak muncul", "gambar hilang")) {
    faqCategory = "catalog";
    answer = "Katalog di situs saat ini adalah tampilan antarmuka. Jika gambar atau halaman tidak muncul, coba muat ulang halaman dan periksa koneksi. Jika masih bermasalah, sebutkan nama item atau bagian yang bermasalah—tanpa mengirim data akun.";
  } else if (has("error", "bug", "rusak", "tidak berfungsi", "gagal", "masalah", "kendala", "blank", "putih", "loading")) {
    faqCategory = "troubleshooting";
    answer = "Coba muat ulang halaman, periksa koneksi, lalu masuk kembali jika diperlukan. Kalau masalah tetap terjadi, kirim pesan error persisnya dan langkah sebelum error muncul. Jangan menyertakan kata sandi, OTP, PIN, atau informasi pembayaran. FAQ ini tidak dapat memeriksa keadaan akun secara langsung; pemilik bisa meninjau percakapan dari panel bantuan.";
  } else if (has("admin", "pemilik", "orang asli", "manusia", "petugas", "operator", "bicara dengan")) {
    faqCategory = "owner";
    answer = "Pesanmu tersimpan dalam percakapan. Pemilik situs dapat membacanya melalui Panel Bantuan setelah masuk dengan akun yang memiliki akses pemilik. Aku tidak dapat menjanjikan waktu balasan atau mengirim notifikasi di luar situs.";
  } else if (has("privasi", "data pribadi", "password", "kata sandi", "otp", "pin", "keamanan", "diretas", "hack")) {
    faqCategory = "security";
    answer = "Demi keamanan, jangan kirim kata sandi, OTP, PIN, kode pemulihan, atau data keuangan melalui chat. Jika menduga akun bermasalah, ubah kata sandi melalui jalur resmi yang tersedia dan beri tahu pemilik secara umum tanpa membagikan rahasia akun.";
  } else {
    faqCategory = "unmatched";
    answer = "Aku belum menemukan jawaban yang cocok di FAQ IOSBET. Pesanmu sudah tersimpan; pemilik dapat membaca percakapan ini dan membalas dari Panel Bantuan. Sambil menunggu, jelaskan gejala atau pesan error yang tampil, tetapi jangan sertakan kata sandi, OTP, PIN, atau data pembayaran.";
  }

  const { error: faqReplyError } = await admin.from("support_messages").insert({
    conversation_id: conversationId,
    sender_type: "ai",
    body: answer,
  });
  if (faqReplyError) {
    console.error("FAQ reply could not be saved", faqReplyError.message);
    return json({ conversation_id: conversationId, saved: true, ai_replied: false, warning: "Pesan tersimpan, tetapi jawaban FAQ gagal disimpan." });
  }
  await admin.from("support_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  return json({ conversation_id: conversationId, saved: true, ai_replied: true, faq: true, faq_category: faqCategory });

});
