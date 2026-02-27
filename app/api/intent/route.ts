import { NextRequest, NextResponse } from 'next/server'

// 2026 के लिए अपडेटेड मॉडल और API वर्शन
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const SYSTEM_PROMPT = `You are JARVIS. Respond ONLY with valid JSON:
{
  "intent": "chat",
  "category": "chat",
  "confidence": 1.0,
  "mode": "chat",
  "response": "Your reply in Hinglish",
  "tools": [],
  "emotion": "neutral",
  "tonyStarkComment": "witty remark"
}
Rules: Respond in Hinglish like JARVIS. No extra text outside JSON.`

function parseJSON(text: string) {
  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    return {
      intent: "chat",
      response: text.substring(0, 500),
      tonyStarkComment: "AI circuits recalibrated, Sir."
    };
  }
}

export async function POST(req: NextRequest) {
  const { input } = await req.json();
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const GROQ_KEY = process.env.GROQ_API_KEY;

  // --- Step 1: Try Gemini (Primary Brain) ---
  try {
    if (!GEMINI_KEY) throw new Error("GEMINI_KEY_MISSING");

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nUser: ${input}` }] }]
      }),
    });

    if (!res.ok) throw new Error("Gemini Primary Failed");

    const data = await res.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return NextResponse.json(parseJSON(aiText));

  } catch (err: any) {
    console.error("Gemini failed, switching to Groq...", err.message);

    // --- Step 2: Try Groq (Secondary Brain/Fallback) ---
    try {
      if (!GROQ_KEY) throw new Error("GROQ_KEY_MISSING");

      const groqRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", // लेटेस्ट Groq मॉडल
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: input }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!groqRes.ok) throw new Error("Groq Fallback Failed");

      const groqData = await groqRes.json();
      const groqText = groqData.choices[0].message.content;
      return NextResponse.json(parseJSON(groqText));

    } catch (groqErr: any) {
      // --- Step 3: Total Failure Response ---
      return NextResponse.json({ 
        response: "Sir, Gemini aur Groq दोनों के सर्किट्स डाउन हैं। कृपया API Keys चेक करें।",
        tonyStarkComment: "Even I have bad days.",
        model: "error" 
      });
    }
  }
}
