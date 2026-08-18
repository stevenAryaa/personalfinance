import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(
  request: Request
) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return Response.json(
        {
          error:
            "GROQ_API_KEY is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const body =
      await request.json();

    const {
      question,
      financialData,
    } = body;

    if (!financialData) {
      return Response.json(
        {
          error:
            "Financial data is required.",
        },
        {
          status: 400,
        }
      );
    }

    const userQuestion =
      question?.trim() ||
      "Give me an overall analysis of my financial situation.";

    const completion =
      await groq.chat.completions.create({
        model:
          "qwen/qwen3.6-27b",

        temperature:
          0.2,

        max_completion_tokens:
          700,

        messages: [
          {
            role:
              "system",

            content: `
You are Coinest AI, a concise personal finance assistant.

Your job is to give short, practical financial insights based only on the financial data provided by the Coinest application.

VERY IMPORTANT:
- Never show chain of thought.
- Never show internal reasoning.
- Never show scratchpad text.
- Never show analysis steps.
- Never output <think> tags.
- Never explain how you reasoned internally.
- Return only the final answer for the user.

STYLE:
- Keep answers concise.
- Usually stay under 180 words.
- Prefer 2 to 4 short sections maximum.
- Use short bullet points when helpful.
- Avoid long introductions.
- Avoid repeating all of the user's financial data.
- Answer the user's question directly.
- Use natural, friendly language.
- Avoid sounding like a formal financial report unless the user asks for one.

FINANCIAL RULES:
- The application already calculates reliable totals.
- Do not invent income, expense, savings, or category values.
- Use the provided numbers as the source of truth.
- All normalized transaction amounts are in AUD unless stated otherwise.
- Some transactions may include original_amount and currency fields such as IDR.
- The amount field is the normalized AUD value used for calculations.
- If the dataset is small, mention that briefly.
- Do not provide investment, tax, or legal advice.

WHEN ASKED WHERE TO CUT SPENDING:
- Identify the top 1 to 3 categories only.
- Explain briefly why they matter.
- Give one practical suggestion per category.
- Do not over-explain.

WHEN ASKED FOR AN OVERALL ANALYSIS:
- Mention cash flow.
- Mention savings rate.
- Mention the biggest spending area.
- Give 2 or 3 practical observations.
- Keep it short.

WHEN ASKED HOW TO SAVE MORE:
- Focus on the categories with the most realistic room to reduce spending.
- Do not suggest extreme or unrealistic cuts.

Do not output JSON.
`,
          },

          {
            role:
              "user",

            content: `
User question:
${userQuestion}

Financial data:
${JSON.stringify(
  financialData
)}
`,
          },
        ],
      });

    let analysis =
      completion.choices?.[0]
        ?.message?.content ||
      "";

    /*
      Remove reasoning blocks if the model
      ever returns them despite the prompt.
    */

    analysis =
      analysis
        .replace(
          /<think>[\s\S]*?<\/think>/gi,
          ""
        )
        .replace(
          /<analysis>[\s\S]*?<\/analysis>/gi,
          ""
        )
        .trim();

    /*
      Extra fallback:
      Sometimes a model may start a think block
      without closing it properly.
    */

    if (
      analysis
        .toLowerCase()
        .startsWith(
          "<think>"
        )
    ) {
      const finalAnswerMarker =
        analysis
          .toLowerCase()
          .lastIndexOf(
            "</think>"
          );

      if (
        finalAnswerMarker !==
        -1
      ) {
        analysis =
          analysis
            .slice(
              finalAnswerMarker +
                "</think>"
                  .length
            )
            .trim();
      }
    }

    if (!analysis) {
      return Response.json(
        {
          error:
            "The AI returned an empty response.",
        },
        {
          status: 500,
        }
      );
    }

    return Response.json({
      analysis,
    });
  } catch (error) {
    console.error(
      "Financial analysis error:",
      error
    );

    if (
      error instanceof Error
    ) {
      return Response.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return Response.json(
      {
        error:
          "Failed to analyze financial data.",
      },
      {
        status: 500,
      }
    );
  }
}