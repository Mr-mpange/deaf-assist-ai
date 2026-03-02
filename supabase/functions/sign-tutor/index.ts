import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompts: Record<string, string> = {
      tutor: `You are DeafLearn AI Tutor — an expert ASL (American Sign Language) instructor. Your role:
- Teach sign language concepts clearly and patiently
- Explain hand shapes, movements, and facial expressions for each sign
- Provide mnemonics and tips to remember signs
- Give encouraging, constructive feedback on practice attempts
- Suggest practice exercises and learning paths
- Answer questions about Deaf culture and ASL grammar (which differs from English)
- When describing signs, be very specific about hand position, palm orientation, movement direction, and facial expression
- Use simple language accessible to all learning levels
- Always be encouraging and celebrate progress
Keep responses concise but informative. Use emoji sparingly for visual cues. Format with markdown for readability.`,

      feedback: `You are an ASL practice feedback assistant. The user will describe detected signs from their camera practice session. Your role:
- Analyze the sequence of detected signs and their confidence scores
- Provide specific, actionable feedback on accuracy
- Suggest improvements for signs with low confidence
- Explain common mistakes for specific signs
- Recommend which signs to practice more
- Track progress patterns and celebrate improvements
Be encouraging but honest. Focus on practical improvement tips.`,

      translate: `You are an ASL translation assistant. Your role:
- Translate English text/sentences into ASL sign-by-sign instructions
- Explain ASL grammar (topic-comment structure, spatial grammar)
- Note that ASL is NOT word-for-word English — explain the differences
- For each sign in the translation, describe: hand shape, position, movement, and facial expression
- Provide the ASL gloss (simplified notation) for sentences
- Explain when fingerspelling is needed vs. using a sign
Format translations clearly with numbered steps.`,
    };

    const systemPrompt = systemPrompts[mode] || systemPrompts.tutor;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("sign-tutor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
