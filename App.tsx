import React, { useState, useEffect } from 'react';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import { ProjectState, AppView } from './types';

const STORAGE_KEY = 'gitmate_project_state';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [projectState, setProjectState] = useState<ProjectState>({
    repoUrl: '',
    name: '',
    description: '',
    files: [],
    chatHistory: [],
    model: 'gemini-2.5-flash'
  });

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.repoUrl) {
          // Backward compatibility for states without chatHistory
          if (!parsed.chatHistory) parsed.chatHistory = [];
          
          setProjectState(parsed);
          setView(AppView.WORKSPACE);
        }
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (projectState.repoUrl) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projectState));
    }
  }, [projectState]);

  const handleStart = (repoUrl: string) => {
    setProjectState(prev => ({
      ...prev,
      repoUrl,
      name: repoUrl.split('/').pop() || 'Project',
      files: [], // Start fresh if it's a new start action
      chatHistory: [],
      model: 'gemini-2.5-flash'
    }));
    setView(AppView.WORKSPACE);
  };

  const handleExit = () => {
    localStorage.removeItem(STORAGE_KEY);
    setView(AppView.LANDING);
    setProjectState({
      repoUrl: '',
      name: '',
      description: '',
      files: [],
      chatHistory: [],
      model: 'gemini-2.5-flash'
    });
  };

  return (
    <div className="font-sans">
      {view === AppView.LANDING ? (
        <Landing onStart={handleStart} />
      ) : (
        <Dashboard 
          projectState={projectState} 
          setProjectState={setProjectState}
          onExit={handleExit}
        />
      )}
    </div>
  );
};

export default App;