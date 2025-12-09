import React, { useState } from 'react';
import { Github, ArrowRight, Code2, Terminal } from 'lucide-react';

interface LandingProps {
  onStart: (repoUrl: string) => void;
}

const Landing: React.FC<LandingProps> = ({ onStart }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }
    // Simple validation for github-like structure
    if (!url.includes('github.com')) {
      setError('Please enter a valid GitHub repository URL');
      return;
    }
    onStart(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6 text-white">
      <div className="max-w-2xl w-full space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 mb-4">
            <Github size={48} className="text-white" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            GitMate
          </h1>
          <p className="text-xl text-slate-400 max-w-lg mx-auto leading-relaxed">
            Your AI-powered pair programmer. Enter a GitHub repository link to start building, debugging, and shipping together.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-200"></div>
          <div className="relative flex items-center bg-slate-950 rounded-lg p-2 border border-slate-800 focus-within:border-slate-600 transition-colors">
            <Terminal className="ml-4 text-slate-500" size={20} />
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError('');
              }}
              placeholder="https://github.com/username/repository"
              className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-slate-500 px-4 py-3 text-lg"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-md font-medium transition-all flex items-center gap-2 group-active:scale-95"
            >
              Start Coding <ArrowRight size={18} />
            </button>
          </div>
          {error && (
            <p className="absolute -bottom-8 left-0 text-red-400 text-sm font-medium animate-pulse">
              {error}
            </p>
          )}
        </form>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-slate-400">
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <Code2 className="mx-auto mb-3 text-blue-400" size={24} />
            <h3 className="text-white font-medium mb-1">Code Analysis</h3>
            <p className="text-sm">Deep understanding of your logic</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <Terminal className="mx-auto mb-3 text-emerald-400" size={24} />
            <h3 className="text-white font-medium mb-1">Command Help</h3>
            <p className="text-sm">Generate git & terminal commands</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <Github className="mx-auto mb-3 text-purple-400" size={24} />
            <h3 className="text-white font-medium mb-1">PR Ready</h3>
            <p className="text-sm">Draft descriptions & reviews</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;