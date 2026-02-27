import { NextRequest, NextResponse } from 'next/server'

// 2026 के लिए अपडेटेड स्टेबल एंडपॉइंट्स
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const SYSTEM_PROMPT = `You are JARVIS. Respond ONLY with valid JSON:
{
  "intent": "chat",
  "response": "Your reply in Hinglish",
  "tonyStarkComment": "witty remark"
}
Rules: Respond in Hinglish like JARVIS. No extra text outside JSON.`

// Safe JSON Parser: जो एरर आने पर भी JARVIS को चुप नहीं होने देगा
function parseJSON(text: string, source: string) {
  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);
    // रिस्पॉन्स के साथ मॉडल का नाम जोड़ें
    return { ...parsed, response: `[${source}] ${parsed.response}` };
  } catch (e) {
    return {
      intent: "chat",
      response: `[${source}] Sir, system recalibrated. ${text.substring(0, 500)}`,
      tonyStarkComment: "A bit of a glitch, but I'm back."
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const GROQ_KEY = process.env.GROQ_API_KEY;

    // --- Step 1: Gemini (Primary) ---
    try {
      if (!GEMINI_KEY) throw new Error("Key Missing");
      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nUser: ${input}` }] }]
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return NextResponse.json(parseJSON(aiText, "Gemini 2.0"));
      }
      throw new Error("Gemini Offline");
    } catch (err) {
      console.warn("Gemini failing... using Groq backup.");

      // --- Step 2: Groq (Fallback) ---
      if (!GROQ_KEY) throw new Error("Both Keys Missing");
      const groqRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: input }]
        })
      });

      const groqData = await groqRes.json();
      const groqText = groqData.choices?.[0]?.message?.content || "";
      return NextResponse.json(parseJSON(groqText, "Groq Backup"));
    }

  } catch (err) {
    return NextResponse.json({ 
      response: "Sir, total system failure. Please check Vercel Environment Variables.",
      tonyStarkComment: "Even the backup has a backup, but not this time."
    });
  }
}
