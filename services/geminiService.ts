import { GoogleGenAI, Chat } from "@google/genai";
import { Message, FileContext } from '../types';

let chatSession: Chat | null = null;

const getSystemInstruction = (repoUrl: string, files: FileContext[]) => {
  const fileContextStr = files.map(f => `
--- FILE: ${f.path} ---
${f.content}
--- END FILE ---
`).join('\n');

  return `You are an expert senior software engineer and pair programmer. 
The user is working on the GitHub repository: ${repoUrl}.

Your goal is to help the user build features, debug code, and understand the architecture.
Always be concise, technically accurate, and provide code examples when relevant.

CURRENT PROJECT CONTEXT (User provided files):
${files.length > 0 ? fileContextStr : 'No specific files provided yet.'}

When the user asks to "build together", assume they want to write code for the repo.
If you need more context about a specific file to answer a question, ask the user to paste it.
`;
};

export const initializeChat = async (repoUrl: string, files: FileContext[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: getSystemInstruction(repoUrl, files),
      temperature: 0.7,
    }
  });
};

export const updateChatContext = async (repoUrl: string, files: FileContext[]) => {
  // Since we can't dynamically update system instruction of an active chat easily in this SDK version without restarting,
  // we will prepend the context update to the next message or re-init if really needed. 
  // For this app, we will re-initialize the chat session to ensure the model attends to new files.
  await initializeChat(repoUrl, files);
};

export const sendMessageStream = async function* (message: string): AsyncGenerator<string, void, unknown> {
  if (!chatSession) {
    throw new Error("Chat session not initialized");
  }

  const responseStream = await chatSession.sendMessageStream({ message });

  for await (const chunk of responseStream) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
};