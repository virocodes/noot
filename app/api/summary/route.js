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
        { role: "system", content: "You are a helpful assistant that summarizes a pdf document." },
        { role: "user", content: `Please summarize the following text:\n\n${text}` }
      ],
    });

    const summary = response.choices[0].message.content.trim();

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error in summary route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
