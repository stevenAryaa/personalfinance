import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function GET() {
  try {
    const models = await groq.models.list();

    return Response.json(models);
  } catch (error: any) {
    console.error("MODEL LIST ERROR:", error);

    return Response.json(
      {
        error:
          error?.error?.message ||
          error?.message ||
          "Could not load models.",
      },
      { status: 500 }
    );
  }
}