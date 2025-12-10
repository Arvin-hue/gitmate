import React, { useState, useEffect, useRef } from 'react';
import { ProjectState, FileContext, Message } from '../types';
import { initializeChat, sendMessageStream, updateChatContext } from '../services/geminiService';
import FileExplorer from './FileExplorer';
import { 
  Plus, 
  FileCode, 
  Trash2, 
  Send, 
  Cpu, 
  Maximize2,
  Minimize2,
  FolderTree,
  Layers,
  Check,
  Copy,
  Terminal,
  RefreshCw,
  MessageSquareOff,
  Eraser,
  Sparkles,
  Zap,
  Settings,
  Paperclip,
  X,
  Image as ImageIcon,
  Edit2,
  Eye,
  Save,
  PlayCircle,
  Bug,
  BookOpen,
  Hammer,
  Download,
  Mic,
  MicOff,
  FilePlus,
  ArrowRight,
  Microscope
} from 'lucide-react';

interface DashboardProps {
  projectState: ProjectState;
  setProjectState: React.Dispatch<React.SetStateAction<ProjectState>>;
  onExit: () => void;
}

// Enhanced Markdown Renderer with Apply capability
const MarkdownMessage: React.FC<{ 
    content: string; 
    isStreaming: boolean;
    onApply: (code: string, lang: string) => void;
}> = ({ content, isStreaming, onApply }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if ((window as any).Prism && !isStreaming) {
       (window as any).Prism.highlightAll();
    }
  }, [content, isStreaming]);

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Split content by code blocks first
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="text-sm leading-relaxed space-y-4">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const match = part.match(/^```(\w*)\n([\s\S]*?)```$/);
          const lang = match ? match[1] : '';
          const code = match ? match[2] : part.slice(3, -3);
          
          return (
            <div key={i} className="rounded-lg overflow-hidden border border-slate-700/50 my-4 shadow-sm group bg-slate-900">
              <div className="bg-slate-800/50 backdrop-blur px-4 py-2 flex items-center justify-between border-b border-slate-700/50">
                <span className="text-xs font-mono text-slate-400 lowercase">{lang || 'text'}</span>
                <div className="flex items-center gap-3">
                    <button 
                      onClick={() => onApply(code, lang)}
                      className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                      title="Apply to file"
                    >
                      <Zap size={14} />
                      <span>Apply</span>
                    </button>
                    <button 
                      onClick={() => handleCopy(code, i)}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      {copiedIndex === i ? (
                        <>
                          <Check size={14} className="text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                </div>
              </div>
              <div className="relative">
                <pre className={`!m-0 !p-4 !bg-transparent !text-sm overflow-x-auto custom-scrollbar language-${lang || 'none'}`}>
                  <code className={`language-${lang || 'none'}`}>{code}</code>
                </pre>
              </div>
            </div>
          );
        }

        // Parse text content line by line for basic Markdown features
        const lines = part.split('\n');
        return (
            <div key={i} className="space-y-2">
                {lines.map((line, lineIdx) => {
                    // Headers
                    if (line.startsWith('### ')) return <h3 key={lineIdx} className="text-lg font-bold text-slate-800 pt-2">{renderInline(line.slice(4))}</h3>;
                    if (line.startsWith('## ')) return <h2 key={lineIdx} className="text-xl font-bold text-slate-900 pt-3 border-b border-slate-200 pb-1">{renderInline(line.slice(3))}</h2>;
                    if (line.startsWith('# ')) return <h1 key={lineIdx} className="text-2xl font-bold text-slate-900 pt-4">{renderInline(line.slice(2))}</h1>;

                    // Unordered Lists
                    if (line.trim().startsWith('- ')) {
                        return (
                            <div key={lineIdx} className="flex gap-2 ml-2">
                                <span className="text-blue-500 font-bold">•</span>
                                <span>{renderInline(line.trim().slice(2))}</span>
                            </div>
                        )
                    }
                    
                    // Empty lines
                    if (!line.trim()) return <div key={lineIdx} className="h-2"></div>;

                    // Standard Paragraph
                    return <p key={lineIdx}>{renderInline(line)}</p>;
                })}
            </div>
        );
      })}
    </div>
  );
};

// Helper for inline markdown (bold, code)
const renderInline = (text: string) => {
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i} className="bg-slate-100 border border-slate-200 text-slate-700 px-1 py-0.5 rounded font-mono text-[90%] font-medium">{part.slice(1, -1)}</code>;
        }
        
        const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
        return boldParts.map((subPart, j) => {
            if (subPart.startsWith('**') && subPart.endsWith('**')) {
                return <strong key={`${i}-${j}`} className="font-bold text-slate-900">{subPart.slice(2, -2)}</strong>;
            }
            return subPart;
        });
    });
};

const Dashboard: React.FC<DashboardProps> = ({ projectState, setProjectState, onExit }) => {
  // Initialize messages from persisted state or default welcome message
  const [messages, setMessages] = useState<Message[]>(() => {
    if (projectState.chatHistory && projectState.chatHistory.length > 0) {
      return projectState.chatHistory;
    }
    return [{
      id: 'welcome',
      role: 'model',
      content: `Hello! I'm ready to pair program on **${projectState.repoUrl.split('/').pop()}**. \n\nBrowse the file explorer on the left to add files to my context, or just ask me anything about the codebase!`,
      timestamp: Date.now()
    }];
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showContext, setShowContext] = useState(true);
  const [activeTab, setActiveTab] = useState<'explorer' | 'context'>('explorer');
  const [showSettings, setShowSettings] = useState(false);
  const [githubToken, setGithubToken] = useState(projectState.githubToken || '');
  
  // File/Image upload state
  const [newFilePath, setNewFilePath] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [isAddingFile, setIsAddingFile] = useState(false);
  
  // File Viewer/Editor State
  const [viewingFile, setViewingFile] = useState<FileContext | null>(null);
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  
  // Image attachment state
  const [attachedImage, setAttachedImage] = useState<{data: string, mimeType: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  
  // Apply Code State
  const [pendingCode, setPendingCode] = useState<{code: string, lang: string} | null>(null);
  const [applyTargetFile, setApplyTargetFile] = useState<string>('');
  const [isCreatingNewFile, setIsCreatingNewFile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Chat with history
  useEffect(() => {
    const init = async () => {
      // Pass existing history to restore session context
      await initializeChat(projectState.repoUrl, projectState.files, projectState.model, messages);
    };
    init();
    // Only run on mount or when critical context (Url/Model) changes. 
    // We don't want to re-init on every message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectState.repoUrl, projectState.model]); 

  // Sync messages to ProjectState for persistence
  useEffect(() => {
    setProjectState(prev => ({
      ...prev,
      chatHistory: messages
    }));
  }, [messages, setProjectState]);

  // Re-highlight when viewing file changes
  useEffect(() => {
      if (viewingFile && !isEditingFile && (window as any).Prism) {
          setTimeout(() => (window as any).Prism.highlightAll(), 0);
      }
  }, [viewingFile, isEditingFile]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, attachedImage]);

  const handleSendMessage = async (customMessage?: string) => {
    const msgContent = customMessage || input;
    if ((!msgContent.trim() && !attachedImage) || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msgContent,
      timestamp: Date.now(),
      attachment: attachedImage ? { ...attachedImage } : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachedImage(null);
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
      const stream = sendMessageStream(userMsg.content, userMsg.attachment);
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

  const handleClearChat = async () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'model',
        content: `Chat cleared. I'm ready for a fresh start!`,
        timestamp: Date.now()
      }
    ]);
    // Reset internal Gemini chat session
    await initializeChat(projectState.repoUrl, projectState.files, projectState.model, []);
  };

  const handleClearContext = async () => {
    setProjectState(prev => ({ ...prev, files: [] }));
    await updateChatContext(projectState.repoUrl, [], projectState.model, messages);
  };

  const handleExportContext = () => {
    // Generate a shell script to recreate the files
    const scriptContent = projectState.files.map(file => {
      // Escape single quotes for shell safety in heredoc
      const safeContent = file.content.replace(/'/g, "'\\''");
      const dir = file.path.substring(0, file.path.lastIndexOf('/'));
      
      return `
# ${file.path}
mkdir -p "${dir}"
cat << 'EOF' > "${file.path}"
${file.content}
EOF
`;
    }).join('\n');

    const fullScript = `#!/bin/bash
# Generated by GitMate - Apply Context Changes
# Run this script to sync the AI context files to your local repository.

echo "Applying changes from GitMate context..."
${scriptContent}
echo "Done!"
`;

    const blob = new Blob([fullScript], { type: 'text/x-sh' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'apply_changes.sh';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddFile = async (path: string, content: string) => {
    if (!path || !content) return;
    
    // Check if updating existing
    const existingIndex = projectState.files.findIndex(f => f.path === path);
    let updatedFiles = [...projectState.files];

    if (existingIndex >= 0) {
        updatedFiles[existingIndex] = { ...updatedFiles[existingIndex], content };
    } else {
        updatedFiles.push({
            id: Date.now().toString(),
            path: path,
            content: content
        });
    }

    setProjectState(prev => ({ ...prev, files: updatedFiles }));
    
    setNewFilePath('');
    setNewFileContent('');
    setIsAddingFile(false);

    await updateChatContext(projectState.repoUrl, updatedFiles, projectState.model, messages);
    setActiveTab('context');
  };

  const removeFile = async (id: string) => {
    const updatedFiles = projectState.files.filter(f => f.id !== id);
    setProjectState(prev => ({ ...prev, files: updatedFiles }));
    await updateChatContext(projectState.repoUrl, updatedFiles, projectState.model, messages);
  };

  const handleAnalyzeFile = (file: FileContext) => {
    const prompt = `Analyze the file \`${file.path}\`.\n1. Explain its purpose.\n2. Identify any potential bugs, security risks, or performance issues.\n3. Suggest specific improvements or refactoring steps.`;
    handleSendMessage(prompt);
  };

  const openFileViewer = (file: FileContext) => {
      setViewingFile(file);
      setEditedContent(file.content);
      setIsEditingFile(false);
  };

  const saveFileChanges = async () => {
      if (!viewingFile) return;
      
      const updatedFiles = projectState.files.map(f => 
          f.id === viewingFile.id ? { ...f, content: editedContent } : f
      );
      
      setProjectState(prev => ({ ...prev, files: updatedFiles }));
      await updateChatContext(projectState.repoUrl, updatedFiles, projectState.model, messages);
      
      // Update the local viewingFile reference so View mode shows new content
      setViewingFile({ ...viewingFile, content: editedContent });
      setIsEditingFile(false);
  };

  const toggleModel = async () => {
      const newModel = projectState.model === 'gemini-3-pro-preview' 
        ? 'gemini-2.5-flash' 
        : 'gemini-3-pro-preview';
      
      setProjectState(prev => ({ ...prev, model: newModel }));
      
      setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'model',
          content: `Switched model to **${newModel === 'gemini-2.5-flash' ? 'Flash (Fast)' : 'Pro (Reasoning)'}**.`,
          timestamp: Date.now()
      }]);

      await updateChatContext(projectState.repoUrl, projectState.files, newModel, messages);
  };

  const saveSettings = () => {
      setProjectState(prev => ({ ...prev, githubToken }));
      setShowSettings(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64String = reader.result as string;
              // Remove data url prefix
              const base64Data = base64String.split(',')[1];
              setAttachedImage({
                  data: base64Data,
                  mimeType: file.type
              });
          };
          reader.readAsDataURL(file);
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleVoiceInput = () => {
      if (isListening) {
          setIsListening(false);
          // Stop logic handled by onend
          return;
      }
      
      if ('webkitSpeechRecognition' in window) {
          const recognition = new (window as any).webkitSpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = 'en-US';

          recognition.onstart = () => setIsListening(true);
          recognition.onend = () => setIsListening(false);
          recognition.onerror = () => setIsListening(false);
          
          recognition.onresult = (event: any) => {
              const transcript = event.results[0][0].transcript;
              setInput(prev => prev + (prev ? ' ' : '') + transcript);
          };
          
          recognition.start();
      } else {
          alert("Speech recognition is not supported in this browser.");
      }
  };

  const handleApplyCodeClick = (code: string, lang: string) => {
      setPendingCode({ code, lang });
      // If there's only one file in context, select it by default? No, safer to ask.
      setApplyTargetFile('');
      setIsCreatingNewFile(false);
  };

  const confirmApplyCode = async () => {
      if (!pendingCode) return;
      if (!applyTargetFile && !isCreatingNewFile) return;

      const path = applyTargetFile;
      const content = pendingCode.code;

      await handleAddFile(path, content);
      
      setPendingCode(null);
      setApplyTargetFile('');
      
      // Optional: Add a system message confirming update?
      setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'model',
          content: `✅ Updated **${path}** in context.`,
          timestamp: Date.now()
      }]);
  };

  const quickActions = [
      { label: 'Explain', icon: BookOpen, prompt: 'Explain the architecture and purpose of the files in context.' },
      { label: 'Find Bugs', icon: Bug, prompt: 'Analyze the context files for potential bugs, security issues, or edge cases.' },
      { label: 'Refactor', icon: Hammer, prompt: 'Suggest refactoring improvements for cleaner, more maintainable code.' },
      { label: 'Test Plan', icon: PlayCircle, prompt: 'Generate a test plan and unit test examples for these files.' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      {/* Sidebar / Context Panel */}
      <div 
        className={`${showContext ? 'w-80 md:w-96 translate-x-0' : 'w-0 -translate-x-full'} 
          bg-white border-r border-slate-200 flex-shrink-0 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] flex flex-col shadow-xl z-20`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col gap-4 bg-white z-10">
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="p-1.5 bg-slate-100 rounded-md">
                    <Terminal size={16} className="text-slate-700" />
                </div>
                <div className="flex flex-col min-w-0">
                   <span className="font-semibold text-slate-800 truncate text-sm leading-tight">
                    {projectState.name}
                   </span>
                   <a href={projectState.repoUrl} target="_blank" rel="noreferrer" className="text-[10px] text-slate-400 hover:text-blue-500 hover:underline truncate">
                     {projectState.repoUrl.replace('https://github.com/', '')}
                   </a>
                </div>
             </div>
             <div className="flex gap-1">
                <button 
                  onClick={() => setShowSettings(true)}
                  className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <Settings size={16} />
                </button>
                <button onClick={() => setShowContext(false)} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors">
                  <Minimize2 size={16} />
                </button>
             </div>
          </div>

          {/* Model Selector */}
          <button 
             onClick={toggleModel}
             className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-200 ${
                 projectState.model === 'gemini-3-pro-preview' 
                 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                 : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
             }`}
          >
             <div className="flex items-center gap-2">
                 {projectState.model === 'gemini-3-pro-preview' 
                    ? <Sparkles size={14} className="text-indigo-600" /> 
                    : <Zap size={14} className="text-amber-500" />
                 }
                 <div className="flex flex-col items-start">
                     <span className="text-xs font-bold leading-none">
                         {projectState.model === 'gemini-3-pro-preview' ? 'Pro Reasoning' : 'Flash Speed'}
                     </span>
                 </div>
             </div>
             <div className="text-[10px] opacity-70 font-medium bg-white/50 px-1.5 py-0.5 rounded">
                Switch
             </div>
          </button>

          {/* Tabs */}
          <div className="flex p-1 bg-slate-100/80 rounded-lg border border-slate-200/50">
             <button 
               onClick={() => setActiveTab('explorer')}
               className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all duration-200 ${activeTab === 'explorer' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
             >
               <FolderTree size={14} /> Explorer
             </button>
             <button 
               onClick={() => setActiveTab('context')}
               className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all duration-200 ${activeTab === 'context' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
             >
               <Layers size={14} /> Context <span className={`px-1.5 rounded-full text-[10px] ${activeTab === 'context' ? 'bg-blue-50 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>{projectState.files.length}</span>
             </button>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'explorer' ? (
            <div className="p-2">
              <FileExplorer 
                repoUrl={projectState.repoUrl} 
                existingFiles={projectState.files}
                token={projectState.githubToken}
                onAddFile={handleAddFile}
              />
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Files</h3>
                 <div className="flex gap-2">
                    {projectState.files.length > 0 && (
                      <>
                        <button 
                            onClick={handleExportContext}
                            className="text-xs flex items-center gap-1.5 text-slate-600 font-medium hover:bg-slate-100 px-2 py-1 rounded-md transition-colors"
                            title="Download context as shell script"
                        >
                            <Download size={14} />
                        </button>
                        <button 
                            onClick={handleClearContext}
                            className="text-xs flex items-center gap-1.5 text-red-500 font-medium hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                            title="Clear all context"
                        >
                            <Eraser size={14} />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => setIsAddingFile(!isAddingFile)}
                      className="text-xs flex items-center gap-1.5 text-blue-600 font-medium hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"
                    >
                      <Plus size={14} /> Add
                    </button>
                 </div>
              </div>

              {isAddingFile && (
                <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <input
                    className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                    placeholder="Path (e.g. src/utils.ts)"
                    value={newFilePath}
                    onChange={e => setNewFilePath(e.target.value)}
                  />
                  <textarea
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono h-24 resize-none transition-all"
                    placeholder="Paste code content..."
                    value={newFileContent}
                    onChange={e => setNewFileContent(e.target.value)}
                  />
                  <div className="flex gap-2 justify-end">
                    <button 
                      onClick={() => setIsAddingFile(false)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleAddFile(newFilePath, newFileContent)}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all"
                    >
                      Add File
                    </button>
                  </div>
                </div>
              )}

              {projectState.files.length === 0 && !isAddingFile && (
                <div className="text-center py-12 px-4 border-2 border-dashed border-slate-100 rounded-xl">
                  <Layers className="mx-auto text-slate-300 mb-3" size={32} />
                  <p className="text-sm text-slate-500 font-medium">No files in context</p>
                  <p className="text-xs text-slate-400 mt-1">Select files from the Explorer to start pairing.</p>
                </div>
              )}

              <div className="space-y-2">
                {projectState.files.map(file => (
                  <div 
                    key={file.id} 
                    onClick={() => openFileViewer(file)}
                    className="group flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="p-1.5 bg-blue-50 rounded text-blue-500">
                        <FileCode size={14} />
                      </div>
                      <span className="text-sm font-medium text-slate-700 truncate" title={file.path}>{file.path}</span>
                    </div>
                    <div className="flex items-center">
                        <button
                           onClick={(e) => { e.stopPropagation(); handleAnalyzeFile(file); }}
                           className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-all mr-1"
                           title="Analyze with AI"
                        >
                           <Microscope size={14} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                          title="Remove from context"
                        >
                          <Trash2 size={14} />
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative bg-slate-50/50">
        {!showContext && (
          <button 
            onClick={() => setShowContext(true)}
            className="absolute top-4 left-4 z-10 p-2.5 bg-white border border-slate-200 shadow-sm rounded-xl hover:bg-slate-50 text-slate-500 transition-all active:scale-95"
            title="Open Sidebar"
          >
            <Maximize2 size={18} />
          </button>
        )}
        
        {/* Chat Toolbar */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button 
                onClick={handleClearChat}
                className="p-2.5 bg-white border border-slate-200 shadow-sm rounded-xl hover:bg-red-50 hover:text-red-500 text-slate-500 transition-all active:scale-95"
                title="Clear Chat"
            >
                <MessageSquareOff size={18} />
            </button>
             <button 
                onClick={onExit}
                className="p-2.5 bg-white border border-slate-200 shadow-sm rounded-xl hover:bg-slate-50 text-slate-500 transition-all active:scale-95"
                title="Exit Project"
            >
                <RefreshCw size={18} />
            </button>
        </div>

        {/* Header Shadow Gradient */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-slate-50 to-transparent z-0 pointer-events-none" />

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth custom-scrollbar pt-20">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-200/50 ${msg.role === 'model' ? 'bg-gradient-to-br from-blue-600 to-indigo-600' : 'bg-white'}`}>
                {msg.role === 'model' ? <Cpu size={18} className="text-white" /> : <div className="text-xs font-bold text-slate-700">You</div>}
              </div>
              
              <div className={`flex-1 min-w-0 ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                 
                 {/* Image Attachment in Chat */}
                 {msg.attachment && (
                     <div className="mb-2 max-w-[300px] overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                         <img 
                            src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} 
                            alt="Attached" 
                            className="w-full h-auto"
                         />
                     </div>
                 )}

                 <div className={`prose prose-slate max-w-none rounded-2xl px-6 py-5 shadow-sm ring-1 ring-slate-900/5 ${
                   msg.role === 'user' 
                    ? 'bg-blue-600 text-white prose-headings:text-white prose-p:text-blue-50 prose-code:text-blue-50 prose-pre:bg-blue-700' 
                    : 'bg-white'
                 }`}>
                    {msg.role === 'model' && msg.isStreaming && !msg.content ? (
                      <div className="flex items-center gap-3 text-slate-500 py-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                        </span>
                        <span className="text-sm font-medium">Thinking...</span>
                      </div>
                    ) : (
                      <MarkdownMessage 
                        content={msg.content} 
                        isStreaming={!!msg.isStreaming} 
                        onApply={handleApplyCodeClick}
                      />
                    )}
                 </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-white/80 backdrop-blur-md border-t border-slate-200 z-20">
          <div className="max-w-4xl mx-auto relative group">
             {attachedImage && (
                 <div className="absolute -top-24 left-0 p-2 bg-white rounded-lg border border-slate-200 shadow-lg flex items-start gap-2 animate-in fade-in slide-in-from-bottom-2">
                     <div className="relative">
                        <img 
                           src={`data:${attachedImage.mimeType};base64,${attachedImage.data}`} 
                           className="w-20 h-20 object-cover rounded-md" 
                           alt="Preview" 
                        />
                        <button 
                            onClick={() => setAttachedImage(null)}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:bg-red-600"
                        >
                            <X size={12} />
                        </button>
                     </div>
                 </div>
             )}

             {/* Quick Actions */}
             {!isTyping && projectState.files.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-3 custom-scrollbar">
                    {quickActions.map(action => (
                        <button
                            key={action.label}
                            onClick={() => setInput(action.prompt)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 text-xs font-medium rounded-full shadow-sm transition-all whitespace-nowrap"
                        >
                            <action.icon size={12} className="text-blue-500" />
                            {action.label}
                        </button>
                    ))}
                </div>
             )}

             <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl opacity-0 group-focus-within:opacity-20 transition duration-500 blur-sm"></div>
             <div className="relative flex items-end gap-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-2 focus-within:border-blue-300 focus-within:shadow-md transition-all">
                <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageSelect}
                />
                
                {/* Attachment Button */}
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-1 p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                    title="Attach Image"
                >
                    <Paperclip size={20} />
                </button>

                {/* Voice Input Button */}
                <button 
                    onClick={toggleVoiceInput}
                    className={`mb-1 p-2 rounded-xl transition-all duration-300 ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50'}`}
                    title={isListening ? "Stop Listening" : "Start Voice Input"}
                >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                <textarea 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  onPaste={e => {
                      const items = e.clipboardData.items;
                      for (let i = 0; i < items.length; i++) {
                          if (items[i].type.indexOf("image") !== -1) {
                              e.preventDefault();
                              const file = items[i].getAsFile();
                              if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                      const base64String = reader.result as string;
                                      setAttachedImage({
                                          data: base64String.split(',')[1],
                                          mimeType: file.type
                                      });
                                  };
                                  reader.readAsDataURL(file);
                              }
                          }
                      }
                  }}
                  placeholder={isListening ? "Listening..." : "Ask about the code, paste images, or request features..."}
                  className="w-full py-3 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[52px] text-slate-700 placeholder:text-slate-400 custom-scrollbar leading-relaxed font-sans"
                  disabled={isTyping}
                  rows={1}
                  style={{ height: 'auto', minHeight: '52px' }}
                  onInput={(e) => {
                    e.currentTarget.style.height = 'auto';
                    e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                  }}
                />
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={(!input.trim() && !attachedImage) || isTyping}
                  className="mb-1 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                >
                  {isTyping ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send size={20} className="ml-0.5" />
                  )}
                </button>
             </div>
             <div className="flex justify-between mt-2 px-2">
                <p className="text-[10px] text-slate-400 font-medium">
                  Hint: Shift+Enter for new line
                </p>
                <p className="text-[10px] text-slate-400">
                  AI can make mistakes. Check important info.
                </p>
             </div>
          </div>
        </div>

        {/* Apply Code Modal */}
        {pendingCode && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                           <Zap size={18} className="text-blue-500" /> Apply Code
                        </h3>
                        <button onClick={() => setPendingCode(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="text-sm text-slate-600">
                            Select a file to update or create a new one with this generated code.
                        </div>

                        {!isCreatingNewFile ? (
                            <div className="space-y-3">
                                {projectState.files.length > 0 ? (
                                    <div className="grid gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        {projectState.files.map(file => (
                                            <button
                                                key={file.id}
                                                onClick={() => setApplyTargetFile(file.path)}
                                                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                                    applyTargetFile === file.path 
                                                    ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500/20' 
                                                    : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                                    <FileCode size={16} />
                                                </div>
                                                <span className="text-sm font-medium text-slate-700 truncate">{file.path}</span>
                                                {applyTargetFile === file.path && <Check size={16} className="ml-auto text-blue-500" />}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 italic text-center py-2">No active files in context.</p>
                                )}
                                
                                <button 
                                    onClick={() => { setIsCreatingNewFile(true); setApplyTargetFile(''); }}
                                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium text-sm"
                                >
                                    <FilePlus size={16} /> Create New File
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">File Path</label>
                                    <input 
                                        autoFocus
                                        type="text" 
                                        value={applyTargetFile}
                                        onChange={e => setApplyTargetFile(e.target.value)}
                                        placeholder="src/components/MyComponent.tsx"
                                        className="w-full p-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                                    />
                                </div>
                                <button 
                                    onClick={() => setIsCreatingNewFile(false)}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    &larr; Back to file list
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                         <button 
                           onClick={() => setPendingCode(null)}
                           className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                         >
                           Cancel
                         </button>
                         <button 
                           onClick={confirmApplyCode}
                           disabled={!applyTargetFile}
                           className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                         >
                           Confirm & Apply <ArrowRight size={16} />
                         </button>
                    </div>
                </div>
            </div>
        )}

        {/* File Viewer/Editor Modal */}
        {viewingFile && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                <FileCode size={20} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-800 text-sm md:text-base">{viewingFile.path}</h3>
                                <p className="text-xs text-slate-500">Context ID: {viewingFile.id}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex bg-slate-200 p-1 rounded-lg mr-2">
                                <button 
                                    onClick={() => setIsEditingFile(false)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!isEditingFile ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Eye size={14} /> View
                                </button>
                                <button 
                                    onClick={() => setIsEditingFile(true)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isEditingFile ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Edit2 size={14} /> Edit
                                </button>
                            </div>
                            <button 
                                onClick={() => setViewingFile(null)} 
                                className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden relative bg-slate-50">
                        {isEditingFile ? (
                            <textarea
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="w-full h-full p-4 font-mono text-sm bg-white text-slate-800 resize-none focus:outline-none"
                                spellCheck={false}
                            />
                        ) : (
                             <div className="absolute inset-0 overflow-auto custom-scrollbar">
                                <pre className="min-h-full p-6 bg-slate-900 text-white text-sm font-mono m-0">
                                    <code className={`language-${viewingFile.path.split('.').pop() || 'text'}`}>
                                        {viewingFile.content}
                                    </code>
                                </pre>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                        <button 
                            onClick={() => setViewingFile(null)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Close
                        </button>
                        {isEditingFile && (
                            <button 
                                onClick={saveFileChanges}
                                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2"
                            >
                                <Save size={16} /> Save Changes
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-semibold text-slate-800">Settings</h3>
                        <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">GitHub Personal Access Token</label>
                            <p className="text-xs text-slate-500">
                                Required to increase API rate limits (60 req/hr -> 5000 req/hr). 
                                Create one with 'repo' scope at github.com/settings/tokens.
                            </p>
                            <input 
                                type="password" 
                                value={githubToken}
                                onChange={e => setGithubToken(e.target.value)}
                                placeholder="ghp_xxxxxxxxxxxx"
                                className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-mono"
                            />
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                         <button 
                           onClick={() => setShowSettings(false)}
                           className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                         >
                           Cancel
                         </button>
                         <button 
                           onClick={saveSettings}
                           className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                         >
                           Save Changes
                         </button>
                    </div>
                </div>
            </div>
        )}
      </div>

    </div>
  );
};

export default Dashboard;