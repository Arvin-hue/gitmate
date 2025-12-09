import React, { useState, useEffect, useRef } from 'react';
import { ProjectState, FileContext, Message } from '../types';
import { initializeChat, sendMessageStream, updateChatContext } from '../services/geminiService';
import { 
  Plus, 
  FileCode, 
  Trash2, 
  Send, 
  Cpu, 
  BookOpen, 
  ChevronRight,
  Loader2,
  Github,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface DashboardProps {
  projectState: ProjectState;
  setProjectState: React.Dispatch<React.SetStateAction<ProjectState>>;
  onExit: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ projectState, setProjectState, onExit }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: `Hello! I'm ready to pair program on **${projectState.repoUrl.split('/').pop()}**. \n\nTo get started, you can paste the contents of key files on the right panel so I can understand the codebase better, or just ask me anything!`,
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showContext, setShowContext] = useState(true);
  
  // File upload state
  const [newFilePath, setNewFilePath] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [isAddingFile, setIsAddingFile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      await initializeChat(projectState.repoUrl, projectState.files);
    };
    init();
  }, [projectState.repoUrl]); // Only re-init if repo changes significantly, files handled separately

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const modelMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: modelMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now(),
      isStreaming: true
    }]);

    try {
      const stream = sendMessageStream(userMsg.content);
      let fullContent = '';

      for await (const chunk of stream) {
        fullContent += chunk;
        setMessages(prev => prev.map(msg => 
          msg.id === modelMsgId 
            ? { ...msg, content: fullContent }
            : msg
        ));
      }
      
      setMessages(prev => prev.map(msg => 
        msg.id === modelMsgId 
          ? { ...msg, isStreaming: false }
          : msg
      ));

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAddFile = async () => {
    if (!newFilePath || !newFileContent) return;
    
    const newFile: FileContext = {
      id: Date.now().toString(),
      path: newFilePath,
      content: newFileContent
    };

    const updatedFiles = [...projectState.files, newFile];
    setProjectState(prev => ({ ...prev, files: updatedFiles }));
    
    // Reset form
    setNewFilePath('');
    setNewFileContent('');
    setIsAddingFile(false);

    // Update AI context
    await updateChatContext(projectState.repoUrl, updatedFiles);
    
    // Notify in chat (optional, but good UX)
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'model',
      content: `I've added **${newFile.path}** to my context.`,
      timestamp: Date.now()
    }]);
  };

  const removeFile = async (id: string) => {
    const updatedFiles = projectState.files.filter(f => f.id !== id);
    setProjectState(prev => ({ ...prev, files: updatedFiles }));
    await updateChatContext(projectState.repoUrl, updatedFiles);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* Sidebar / Context Panel */}
      <div 
        className={`${showContext ? 'w-96 translate-x-0' : 'w-0 -translate-x-full'} 
          bg-white border-r border-slate-200 flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col`}
      >
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <BookOpen size={18} className="text-blue-600" />
            <h2>Project Context</h2>
          </div>
          <button onClick={() => setShowContext(false)} className="p-1 hover:bg-slate-200 rounded">
             <Minimize2 size={16} className="text-slate-500"/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Repository</h3>
            <a href={projectState.repoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1 truncate">
              <Github size={14} />
              {projectState.repoUrl.replace('https://github.com/', '')}
            </a>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Context Files ({projectState.files.length})</h3>
              <button 
                onClick={() => setIsAddingFile(!isAddingFile)}
                className="text-xs flex items-center gap-1 text-blue-600 font-medium hover:text-blue-700"
              >
                <Plus size={14} /> Add File
              </button>
            </div>

            {isAddingFile && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <input
                  className="w-full text-sm p-2 border border-slate-200 rounded focus:border-blue-500 focus:outline-none"
                  placeholder="File path (e.g. src/App.tsx)"
                  value={newFilePath}
                  onChange={e => setNewFilePath(e.target.value)}
                />
                <textarea
                  className="w-full text-xs p-2 border border-slate-200 rounded focus:border-blue-500 focus:outline-none font-mono h-32"
                  placeholder="Paste file content here..."
                  value={newFileContent}
                  onChange={e => setNewFileContent(e.target.value)}
                />
                <div className="flex gap-2 justify-end">
                  <button 
                    onClick={() => setIsAddingFile(false)}
                    className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddFile}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add to Context
                  </button>
                </div>
              </div>
            )}

            {projectState.files.length === 0 && !isAddingFile && (
              <p className="text-sm text-slate-400 italic text-center py-4">
                No files added yet. Add snippets to improve the AI's answers.
              </p>
            )}

            {projectState.files.map(file => (
              <div key={file.id} className="group flex items-start justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors shadow-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileCode size={16} className="text-slate-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-700 truncate">{file.path}</span>
                </div>
                <button 
                  onClick={() => removeFile(file.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {!showContext && (
          <button 
            onClick={() => setShowContext(true)}
            className="absolute top-4 left-4 z-10 p-2 bg-white border border-slate-200 shadow-sm rounded-lg hover:bg-slate-50 text-slate-500"
          >
            <Maximize2 size={18} />
          </button>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'model' ? 'bg-gradient-to-br from-blue-500 to-emerald-500' : 'bg-slate-200'}`}>
                {msg.role === 'model' ? <Cpu size={20} className="text-white" /> : <div className="text-sm font-bold text-slate-600">You</div>}
              </div>
              
              <div className={`flex-1 min-w-0 ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                 <div className={`prose prose-slate max-w-none rounded-2xl p-6 shadow-sm ${
                   msg.role === 'user' 
                    ? 'bg-blue-600 text-white prose-headings:text-white prose-p:text-blue-50 prose-code:text-blue-50 prose-pre:bg-blue-700' 
                    : 'bg-white border border-slate-200 prose-pre:bg-slate-900 prose-pre:text-slate-50'
                 }`}>
                    {/* Simple rendering of content. For complex Markdown, we'd use react-markdown here */}
                    {msg.role === 'model' && msg.isStreaming && !msg.content ? (
                      <span className="flex items-center gap-2 text-slate-400">
                        <Loader2 size={16} className="animate-spin" /> Thinking...
                      </span>
                    ) : (
                      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed font-normal">
                        {/* Basic parser to highlight code blocks if we aren't using a heavy lib */}
                         {msg.content.split(/(```[\s\S]*?```)/g).map((part, i) => {
                           if (part.startsWith('```')) {
                             const codeContent = part.replace(/^```[a-z]*\n/, '').replace(/```$/, '');
                             return (
                               <pre key={i} className="my-4 p-4 rounded-lg bg-slate-900 text-slate-50 overflow-x-auto font-mono text-xs">
                                 <code>{codeContent}</code>
                               </pre>
                             );
                           }
                           return <span key={i}>{part}</span>;
                         })}
                      </div>
                    )}
                 </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-200">
          <div className="max-w-4xl mx-auto relative">
             <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Ask about the code, request features, or paste snippets..."
              className="w-full pl-6 pr-14 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none shadow-sm text-slate-700"
              disabled={isTyping}
             />
             <button 
              onClick={handleSendMessage}
              disabled={!input.trim() || isTyping}
              className="absolute right-3 top-3 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
             >
               {isTyping ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
             </button>
          </div>
          <div className="text-center mt-2 text-xs text-slate-400">
            AI can make mistakes. Review generated code carefully.
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;