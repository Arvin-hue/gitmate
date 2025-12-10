export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  attachment?: {
    data: string; // base64
    mimeType: string;
  };
}

export interface FileContext {
  id: string;
  path: string;
  content: string;
}

export interface ProjectState {
  repoUrl: string;
  name: string;
  description: string;
  files: FileContext[];
  chatHistory: Message[];
  model?: string; // 'gemini-2.5-flash' | 'gemini-3-pro-preview'
  githubToken?: string;
}

export enum AppView {
  LANDING = 'LANDING',
  WORKSPACE = 'WORKSPACE'
}

export interface ChatSession {
  id: string;
  messages: Message[];
}

export interface GitHubNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  url: string;
  download_url: string | null;
}