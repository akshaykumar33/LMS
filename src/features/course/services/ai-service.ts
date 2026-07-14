import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

interface AiResponse {
  text: string;
  flashcards?: Array<{ q: string; a: string }>;
  quiz?: Array<{ q: string; opts: string[]; answer: number }>;
}

export async function getAiCompletionForTenant(
  tenantId: string,
  lessonTitle: string,
  lessonContent: string,
  queryText: string
): Promise<AiResponse> {
  // 1. Fetch Tenant settings
  const tenant = await db.query.tenants.findFirst({
    where: eq(schema.tenants.id, tenantId),
  });

  const aiSettings = (tenant?.settings as any)?.ai || {};
  const apiKey = aiSettings.apiKey || process.env.OPENAI_API_KEY;
  const provider = aiSettings.provider || process.env.AI_PROVIDER || "mock";

  // 2. Build context and system prompts
  const systemPrompt = `You are a helpful AI Tutor Assistant for Wysbryx LMS.
You are helping a student study the lesson: "${lessonTitle}".
Here is the lesson transcript/content notes to use as your knowledge base context:
"""
${lessonContent}
"""

Instructions:
- Provide high-quality, professional, and educational responses.
- If the user asks for a summary, return a structured key points summary.
- If the user asks for flashcards, generate 2-3 interactive Q&A study cards.
- If the user asks for a quiz, generate 2 multiple-choice questions with options and the zero-indexed answer key.
- Ground your answer in the lesson context wherever possible.`;

  // 3. Check for real AI provider calls if API Key is available
  if (apiKey && apiKey !== "mock-key" && provider !== "mock") {
    try {
      if (provider === "openai" || !provider) {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: aiSettings.model || "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: queryText },
            ],
            temperature: 0.3,
            response_format: queryText.toLowerCase().includes("json") || queryText.toLowerCase().includes("flashcard") || queryText.toLowerCase().includes("quiz") 
              ? { type: "json_object" } 
              : undefined,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0]?.message?.content;
          if (content) {
            try {
              // Parse if JSON format is expected/returned
              if (content.trim().startsWith("{")) {
                const parsed = JSON.parse(content);
                return {
                  text: parsed.text || parsed.summary || "Here is the result:",
                  flashcards: parsed.flashcards,
                  quiz: parsed.quiz,
                };
              }
            } catch {}
            return { text: content };
          }
        } else {
          console.warn("OpenAI API call failed, falling back to local RAG generator.");
        }
      }
    } catch (e) {
      console.error("Error executing real AI Completion call:", e);
    }
  }

  // 4. Advanced, content-aware local fallback RAG Generator (Mock LLM)
  const normalizedQuery = queryText.toLowerCase();

  // Helper to extract key sentences/terms from content
  const lines = lessonContent
    .split(/[.!\n]/)
    .map(line => line.trim())
    .filter(line => line.length > 20);

  if (normalizedQuery.includes("summarize") || normalizedQuery.includes("summary")) {
    const highlights = lines.slice(0, 3).map(l => `• **Key Point**: ${l}.`).join("\n");
    return {
      text: `Here is a structured RAG summary of "${lessonTitle}":\n\n${highlights || "• **Overview**: Study and master details described in the syllabus outline."}\n\n• **Core Objective**: Retain and apply this knowledge in course assessments.`,
    };
  }

  if (normalizedQuery.includes("flashcard") || normalizedQuery.includes("generate flashcards")) {
    const card1_q = lines[0] ? `What is a primary concept of ${lessonTitle}?` : "What is the focus of this lesson?";
    const card1_a = lines[0] ? `${lines[0]}.` : "The core concepts and fundamentals of this module.";
    const card2_q = lines[1] ? `Explain: ${lines[1].split(" ").slice(0, 4).join(" ")}...` : "Explain the significance of this module.";
    const card2_a = lines[1] ? `It refers to: ${lines[1]}.` : "It is crucial to understand these parameter rules for validation.";

    return {
      text: "I have generated 2 interactive learning flashcards for you based on the lesson notes! See them in the AI panel below.",
      flashcards: [
        { q: card1_q, a: card1_a },
        { q: card2_q, a: card2_a },
      ],
    };
  }

  if (normalizedQuery.includes("quiz") || normalizedQuery.includes("quiz me")) {
    const q1_text = lines[0] ? `Which statement is correct regarding ${lessonTitle}?` : "Which parameter is critical to model in semiconductor layouts?";
    const q1_opt1 = lines[0] ? `${lines[0]}.` : "Thermal dissipation, layout parasitics, and leakage profiles.";
    const q1_opt2 = "It is completely negligible in low-power operations.";
    const q1_opt3 = "It only applies to legacy 180nm nodes.";

    const q2_text = lines[1] ? `Fill in: "... ${lines[1].split(" ").slice(4, 10).join(" ")}..."` : "What is a main limiting factor of optical lithography?";
    const q2_opt1 = "Silicon substrate depth constraints.";
    const q2_opt2 = lines[1] ? `${lines[1]}.` : "Light wavelength (lambda) and numerical aperture.";
    const q2_opt3 = "The physical width of the wafer edge.";

    return {
      text: "I have compiled a 2-question quick test based on this module. Complete it in the assistant panel below!",
      quiz: [
        {
          q: q1_text,
          opts: [q1_opt1, q1_opt2, q1_opt3],
          answer: 0,
        },
        {
          q: q2_text,
          opts: [q2_opt1, q2_opt2, q2_opt3],
          answer: 1,
        },
      ],
    };
  }

  // General Q&A: Search context for matching lines
  const matchingLines = lines.filter(l => 
    queryText.split(" ").some(word => word.length > 3 && l.toLowerCase().includes(word.toLowerCase()))
  );

  if (matchingLines.length > 0) {
    return {
      text: `Based on the lesson notes for "${lessonTitle}", here is what we found:\n\n${matchingLines.slice(0, 2).map(l => `• ${l}.`).join("\n\n")}\n\nLet me know if you need any other concepts summarized!`,
    };
  }

  return {
    text: `Regarding "${queryText}" in "${lessonTitle}":\n\nThe materials indicate that we must study the physical limits and verification guidelines carefully. In modern nodes, these structures require meticulous layout matching, parasitic analysis, and thermal profile validation to prevent chip defect issues.`,
  };
}
