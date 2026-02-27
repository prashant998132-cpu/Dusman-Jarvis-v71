import { NextRequest, NextResponse } from 'next/server'

// 2026 के लेटेस्ट स्टेबल एंडपॉइंट्स
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const SYSTEM_PROMPT = `You are JARVIS. Respond ONLY with valid JSON. Include "activeModel" key to identify yourself.`

export async function POST(req: NextRequest) {
  const { input } = await req.json();
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const GROQ_KEY = process.env.GROQ_API_KEY;

  // --- Step 1: Try Gemini (Primary) ---
  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nUser: ${input}` }] }]
      }),
    });

    if (!res.ok) throw new Error("Gemini Offline");

    const data = await res.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const final = JSON.parse(aiText.replace(/```json|```/g, ''));
    
    // यहाँ हमने 'model' टैग जोड़ दिया है ताकि आपको पता चले Gemini चल रहा है
    return NextResponse.json({ ...final, activeModel: "Gemini 2.0" });

  } catch (err) {
    console.log("Gemini down, switching to Groq...");

    // --- Step 2: Try Groq (Backup) ---
    try {
      const groqRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: input }],
          response_format: { type: "json_object" }
        })
      });

      const groqData = await groqRes.json();
      const groqFinal = JSON.parse(groqData.choices[0].message.content);
      
      return NextResponse.json({ ...groqFinal, activeModel: "Groq (Backup)" });

    } catch (e) {
      return NextResponse.json({ response: "Sir, all systems are offline." });
    }
  }
  }
