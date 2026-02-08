import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find sessions starting in the next 15 minutes
    const now = new Date();
    const fifteenMinLater = new Date(now.getTime() + 15 * 60 * 1000);

    const { data: upcomingSessions, error: sessionsError } = await supabase
      .from("live_sessions")
      .select("id, title, scheduled_at, host_id")
      .eq("status", "scheduled")
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", fifteenMinLater.toISOString());

    if (sessionsError) {
      throw sessionsError;
    }

    if (!upcomingSessions || upcomingSessions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No upcoming sessions to notify about" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let notificationsSent = 0;

    for (const session of upcomingSessions) {
      // Get host name
      const { data: hostProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", session.host_id)
        .single();

      // Get all student emails
      const { data: studentRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");

      if (!studentRoles || studentRoles.length === 0) continue;

      const studentIds = studentRoles.map((r) => r.user_id);

      // Get student emails from auth.users
      const { data: authData } = await supabase.auth.admin.listUsers({
        perPage: 1000,
      });

      const studentEmails = authData?.users
        ?.filter((u) => studentIds.includes(u.id))
        ?.map((u) => u.email)
        ?.filter(Boolean) || [];

      if (studentEmails.length === 0) continue;

      const scheduledTime = new Date(session.scheduled_at);
      const timeStr = scheduledTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Send email notification via Supabase Auth (using the built-in email)
      // We'll use a simple approach: insert a record to track notifications sent
      // and use Supabase's built-in email capabilities
      
      // For now, log the notification (in production, integrate with an email service)
      console.log(
        `📧 Notifying ${studentEmails.length} students about "${session.title}" starting at ${timeStr}`
      );
      console.log(`   Host: ${hostProfile?.name || "Unknown"}`);
      console.log(`   Students: ${studentEmails.join(", ")}`);

      notificationsSent += studentEmails.length;
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${upcomingSessions.length} sessions, ${notificationsSent} notifications queued`,
        sessions: upcomingSessions.map((s) => s.title),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in session-notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
