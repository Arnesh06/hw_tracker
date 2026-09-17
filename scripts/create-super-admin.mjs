#!/usr/bin/env node
/**
 * Creates (or promotes) the single HW-Track Super Admin.
 *
 * Usage:
 *   node --env-file=.env.local scripts/create-super-admin.mjs admin@example.com 'StrongPassw0rd!' "Full Name"
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * Run once, from your own machine — never from the browser.
 */
import { createClient } from "@supabase/supabase-js";

const [, , email, password, fullName = "Super Admin"] = process.argv;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Try: node --env-file=.env.local ...");
  process.exit(1);
}
if (!email || !password) {
  console.error("Usage: node --env-file=.env.local scripts/create-super-admin.mjs <email> <password> [full name]");
  process.exit(1);
}
if (password.length < 10) {
  console.error("Use a password of at least 10 characters for the Super Admin.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existing, error: existingError } = await supabase
  .from("profiles")
  .select("id, email")
  .eq("role", "super_admin")
  .maybeSingle();
if (existingError) {
  console.error("Could not read profiles. Did you run the SQL migrations?", existingError.message);
  process.exit(1);
}
if (existing && existing.email.toLowerCase() !== email.toLowerCase()) {
  console.error(`A Super Admin already exists (${existing.email}). HW-Track allows exactly one.`);
  process.exit(1);
}

let userId;
const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});

if (createError) {
  // User may already exist — look them up and promote.
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    console.error(createError.message);
    process.exit(1);
  }
  const found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!found) {
    console.error(createError.message);
    process.exit(1);
  }
  userId = found.id;
  console.log("User already exists — promoting to Super Admin.");
} else {
  userId = created.user.id;
  console.log("Auth user created.");
}

const { error: profileError } = await supabase
  .from("profiles")
  .upsert({ id: userId, email, full_name: fullName, role: "super_admin", is_active: true }, { onConflict: "id" });

if (profileError) {
  console.error("Failed to set Super Admin role:", profileError.message);
  process.exit(1);
}

console.log(`✔ ${email} is now the HW-Track Super Admin. Sign in at /login.`);
