// Edge Function: invite-athlete
// Appelée par le coach depuis le Dashboard pour créer le compte d'un(e) athlète.
// Utilise la service role key (jamais exposée au frontend) pour créer l'utilisateur
// auth, lui envoyer un email d'invitation, et créer ses lignes profiles + athletes.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteAthletePayload {
  email: string;
  first_name: string;
  last_name: string;
  sex?: "M" | "F";
  birth_date?: string;
  category?: string;
  group_ids?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client "appelant" : vérifie qui fait la requête via son JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();

    if (!caller) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "coach") {
      return new Response(JSON.stringify({ error: "Réservé au coach" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: InviteAthletePayload = await req.json();
    if (!payload.email || !payload.first_name || !payload.last_name) {
      return new Response(JSON.stringify({ error: "email, first_name, last_name requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Crée l'utilisateur et envoie l'email d'invitation (définition du mot de passe)
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      payload.email,
    );

    if (inviteError || !invited.user) {
      return new Response(JSON.stringify({ error: inviteError?.message ?? "Échec invitation" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = invited.user.id;

    const { error: profileError } = await admin.from("profiles").insert({
      id: newUserId,
      role: "athlete",
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
    });

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: athleteError } = await admin.from("athletes").insert({
      id: newUserId,
      sex: payload.sex,
      birth_date: payload.birth_date,
      category: payload.category,
    });

    if (athleteError) {
      return new Response(JSON.stringify({ error: athleteError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.group_ids?.length) {
      const rows = payload.group_ids.map((group_id) => ({ athlete_id: newUserId, group_id }));
      const { error: groupsError } = await admin.from("athlete_groups").insert(rows);
      if (groupsError) {
        return new Response(JSON.stringify({ error: groupsError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ id: newUserId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
