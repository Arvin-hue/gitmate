export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
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
}

export enum AppView {
  LANDING = 'LANDING',
  WORKSPACE = 'WORKSPACE'
}

export interface ChatSession {
  id: string;
  messages: Message[];
}