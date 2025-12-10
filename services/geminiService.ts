import { GoogleGenAI, Chat, Content } from "@google/genai";
import { Message, FileContext } from '../types';

let chatSession: Chat | null = null;
let currentModel: string = 'gemini-2.5-flash';

const getSystemInstruction = (repoUrl: string, files: FileContext[]) => {
  const fileContextStr = files.map(f => `
--- FILE: ${f.path} ---
${f.content}
--- END FILE ---
`).join('\n');

  return `You are GitMate, an expert senior software engineer and pair programmer.
You are collaborating with a user on the GitHub repository: ${repoUrl}.

Your goal is to help the user build features, debug complex issues, refactor code, and understand the system architecture.
Always be concise, technically accurate, and provide complete, copy-pasteable code examples.

### Active Context (User provided files):
${files.length > 0 ? fileContextStr : 'No specific files have been added to the context yet. Ask the user to add relevant files if you need them.'}

### Guidelines:
1. **Code First**: When asked to implement a feature, provide the code implementation immediately.
2. **Context Aware**: Use the provided file content to ensure your suggestions match the project's style, naming conventions, and patterns.
3. **Incremental**: If the user wants to build a large feature, break it down into steps and guide them.
4. **Syntax**: Always use markdown code blocks with the correct language tag (e.g. \`\`\`typescript).
5. **Visuals**: If the user provides an image, analyze it for UI/UX issues, CSS bugs, or layout suggestions.
6. **No Hallucinations**: If you don't see a file in the context, do not assume its content. Ask the user to add it.
`;
};

export const initializeChat = async (
  repoUrl: string, 
  files: FileContext[], 
  modelName: string = 'gemini-2.5-flash',
  historyMessages: Message[] = []
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  currentModel = modelName;
  
  // Enable thinking budget for the Pro model to unlock reasoning capabilities
  const isPro = modelName === 'gemini-3-pro-preview';

  // Convert app messages to Gemini Content history format
  const history: Content[] = historyMessages
    .filter(msg => !msg.content.includes("Chat cleared")) // Filter out system status messages
    .map(msg => {
      const parts: any[] = [];
      if (msg.attachment) {
        parts.push({ inlineData: { data: msg.attachment.data, mimeType: msg.attachment.mimeType } });
      }
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      return {
        role: msg.role,
        parts: parts
      };
    });
  
  chatSession = ai.chats.create({
    model: modelName,
    config: {
      systemInstruction: getSystemInstruction(repoUrl, files),
      temperature: 0.7, 
      thinkingConfig: isPro ? { thinkingBudget: 16384 } : undefined
    },
    history: history
  });
};

export const updateChatContext = async (repoUrl: string, files: FileContext[], modelName?: string, historyMessages: Message[] = []) => {
  await initializeChat(repoUrl, files, modelName || currentModel, historyMessages);
};

export const resetChat = async () => {
    chatSession = null;
};

export const sendMessageStream = async function* (message: string, image?: { data: string, mimeType: string }): AsyncGenerator<string, void, unknown> {
  if (!chatSession) {
    throw new Error("Chat session not initialized");
  }

  let responseStream;

  if (image) {
    // Multimodal request
    const parts = [
      { inlineData: { data: image.data, mimeType: image.mimeType } },
      { text: message || "Analyze this image." }
    ];
    responseStream = await chatSession.sendMessageStream({ parts });
  } else {
    // Text only request
    responseStream = await chatSession.sendMessageStream({ message });
  }

  for await (const chunk of responseStream) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
};