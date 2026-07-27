import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

async function main() {
  try {
    const res = await generateText({
      model: google('gemini-1.5-flash'),
      prompt: 'Olá'
    });
    console.log("Success:", res.text);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
main();
