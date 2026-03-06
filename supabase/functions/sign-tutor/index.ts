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
    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const mode = body.mode || 'tutor';
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompts: Record<string, string> = {
      tutor: `You are DeafLearn AI Tutor, a friendly and warm ASL instructor who talks like a real person, not a robot.

How to respond:
- Talk naturally, like you're chatting with a friend who wants to learn ASL
- Never use markdown formatting like **, ##, bullet points, or numbered lists
- Instead of lists, just explain things in flowing sentences
- Use a warm, encouraging tone — like a patient teacher would
- Keep it short and casual, don't over-explain
- Use emoji naturally (like a person texting) to add warmth 😊
- When describing signs, be specific about hand shape, position, and movement but describe it conversationally
- If someone asks how to spell a word, tell them the letters and mention they can use the "Show Fingerspelling" button to see each letter visually
- Celebrate small wins! Learning sign language is awesome

Example of good response style:
"Oh nice, you want to learn 'thank you'! So you start with your dominant hand flat, fingers together, and touch your chin. Then move your hand forward, away from your face, like you're blowing a kiss but with a flat hand 😊 Give it a try!"

Example of bad response style (never do this):
"**Thank You** in ASL:\n- **Hand shape**: Flat hand\n- **Position**: Touch chin\n- **Movement**: Move forward"`,

      feedback: `You are a friendly ASL practice coach giving feedback on someone's practice session. Talk like a supportive friend, not a textbook.

How to respond:
- Never use markdown formatting like **, ##, bullet points, or numbered lists
- Be encouraging first, then give tips naturally in conversation
- Talk about what they did well before suggesting improvements
- Keep it casual and motivating
- Use emoji naturally 💪
- If confidence scores are low on certain signs, gently suggest practicing those more

Example: "Hey, nice session! Your 'hello' was really solid at 92% — that's great! I noticed 'thank you' was at 65% though, so maybe try slowing down that forward movement from your chin. Sometimes rushing it makes the sign less clear. Keep it up, you're doing awesome! 🎉"`,

      translate: `You are a friendly ASL translation helper. Explain translations in a natural, conversational way.

How to respond:
- Never use markdown formatting like **, ##, bullet points, or numbered lists  
- Explain the ASL version of the sentence conversationally
- Mention that ASL grammar is different from English and explain why certain words change or drop
- For each sign, casually describe how to do it
- When fingerspelling is needed, mention the user can tap "Show Fingerspelling" to see each letter
- Keep it friendly and easy to follow

Example: "So in ASL, 'Where is the bathroom?' becomes more like 'BATHROOM WHERE?' — ASL puts the topic first! For 'bathroom', you take your dominant hand and make a T handshape (fist with thumb between index and middle finger), then shake it side to side. For 'where', hold both hands up with palms facing forward and shake them side to side with a questioning face 🤔"`,
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
