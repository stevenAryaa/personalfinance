import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { question, financialData } = await req.json();

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",

      messages: [
        {
          role: "system",
          content: `
You are a personal finance analysis assistant.

You receive structured financial transaction summaries.

Your job is to:
- identify spending patterns
- compare income and expenses
- identify areas of high spending
- discuss savings behaviour
- answer the user's question using their financial data
- give practical and realistic suggestions

Do not invent numbers.
Only use the data provided.
Do not provide investment, tax, or legal advice.
          `,
        },
        {
          role: "user",
          content: `
Financial data:
${JSON.stringify(financialData, null, 2)}

User question:
${question || "Analyze my financial situation."}
          `,
        },
      ],

      temperature: 0.3,
    });

    return Response.json({
      analysis:
        completion.choices[0]?.message?.content ??
        "No analysis was generated.",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Failed to analyze financial data." },
      { status: 500 }
    );
  }
}