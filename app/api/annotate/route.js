import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an assistant that provides annotations for a document. Provide 3-5 key annotations that highlight important points or areas that need clarification." },
        { role: "user", content: `Please provide annotations for the following text:\n\n${text}` }
      ],
    });

    const annotations = response.choices[0].message.content.trim().split('\n');

    return NextResponse.json({ annotations });
  } catch (error) {
    console.error('Error in annotate route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
