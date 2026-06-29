import OpenAI from 'openai';

const client = new OpenAI();

export async function askAgent(systemPrompt, userMessage, options = {}) {
  try {
    const response = await client.chat.completions.create({
      model: options.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: typeof userMessage === 'string' ? userMessage : JSON.stringify(userMessage) }
      ],
      temperature: options.temperature || 0.3,
      response_format: options.json ? { type: 'json_object' } : undefined
    });
    const content = response.choices[0].message.content;
    if (options.json) {
      try { return JSON.parse(content); } catch { return content; }
    }
    return content;
  } catch (err) {
    console.error(`[AI Error] ${err.message}`);
    return options.json ? {} : '';
  }
}
