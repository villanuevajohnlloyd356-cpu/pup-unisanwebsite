import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured.");
    return json(500, { error: "The faculty service is not configured." });
  }

  const authorization = request.headers.get("Authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json(401, { error: "Not signed in" });

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json(401, { error: "Invalid session" });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (profileError) {
      console.error("Could not verify administrator role:", profileError.message);
      return json(500, { error: "Could not verify administrator access." });
    }
    if (profile?.role !== "admin") {
      return json(403, { error: "Administrator access required" });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return json(400, { error: "Bad request" });
    }

    if (body.action === "create") {
      const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
      const facultyId = typeof body.faculty_id === "string" ? body.faculty_id.trim() : "";
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const department = typeof body.department === "string" ? body.department.trim() : "";
      const position = typeof body.position === "string" ? body.position.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";
      const photoUrl = typeof body.photo_url === "string" ? body.photo_url.trim() : "";

      if (!fullName || !facultyId || !email || !department || !position) {
        return json(400, { error: "All fields except photo are required" });
      }
      if (!emailPattern.test(email)) return json(400, { error: "Enter a valid email address" });
      if (password.length < 8) {
        return json(400, { error: "Temporary password must be at least 8 characters" });
      }

      const [emailMatch, facultyIdMatch] = await Promise.all([
        supabase.from("faculty").select("id").eq("email", email).maybeSingle(),
        supabase.from("faculty").select("id").eq("faculty_id", facultyId).maybeSingle(),
      ]);
      if (emailMatch.error || facultyIdMatch.error) {
        console.error("Could not check for duplicate faculty:", emailMatch.error || facultyIdMatch.error);
        return json(500, { error: "Could not check for an existing faculty record." });
      }
      if (emailMatch.data || facultyIdMatch.data) {
        return json(409, { error: "A faculty record with this email or ID already exists" });
      }

      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError || !created.user) {
        return json(400, { error: createError?.message || "Could not create account" });
      }

      const { error: profileInsertError } = await supabase.from("profiles").insert({
        id: created.user.id,
        role: "faculty",
        full_name: fullName,
      });
      if (profileInsertError) {
        console.error("Could not create faculty profile:", profileInsertError.message);
        await supabase.auth.admin.deleteUser(created.user.id);
        return json(500, { error: "Could not save faculty profile." });
      }

      const { error: facultyInsertError } = await supabase.from("faculty").insert({
        user_id: created.user.id,
        full_name: fullName,
        faculty_id: facultyId,
        email,
        department,
        position,
        photo_url: photoUrl || null,
      });
      if (facultyInsertError) {
        console.error("Could not create faculty record:", facultyInsertError.message);
        await supabase.auth.admin.deleteUser(created.user.id);
        if (facultyInsertError.code === "23505") {
          return json(409, { error: "A faculty record with this email or ID already exists" });
        }
        return json(500, { error: "Could not save faculty record" });
      }

      return json(200, { ok: true });
    }

    if (body.action === "delete") {
      const id = typeof body.id === "string" ? body.id : "";
      if (!id) return json(400, { error: "Faculty ID is required" });

      const { data: faculty, error: lookupError } = await supabase
        .from("faculty")
        .select("user_id")
        .eq("id", id)
        .maybeSingle();
      if (lookupError) {
        console.error("Could not find faculty record:", lookupError.message);
        return json(500, { error: "Could not find faculty record." });
      }
      if (!faculty) return json(404, { error: "Not found" });

      const { error: deleteError } = await supabase.from("faculty").delete().eq("id", id);
      if (deleteError) {
        console.error("Could not delete faculty record:", deleteError.message);
        return json(500, { error: "Could not delete faculty record." });
      }
      if (faculty.user_id) {
        const { error: accountError } = await supabase.auth.admin.deleteUser(faculty.user_id);
        if (accountError) {
          console.error("Could not delete faculty login:", accountError.message);
          return json(500, { error: "Faculty record deleted, but the login account could not be removed." });
        }
      }
      return json(200, { ok: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (error) {
    console.error("manage-faculty function error:", error);
    return json(500, { error: "The faculty service encountered a server error." });
  }
});
