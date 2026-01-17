import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, Power, Activity, AlertTriangle } from 'lucide-react';
import './index.css';

function App() {
  const [isProtected, setIsProtected] = useState(true);
  const [stats, setStats] = useState({ scanned: 0, blocked: 0 });

  // Load stats from Chrome storage (if available)
  useEffect(() => {
    if (window.chrome && window.chrome.storage) {
      window.chrome.storage.local.get(['scannedCount', 'blockedCount'], (result) => {
        setStats({
          scanned: result.scannedCount || 0,
          blocked: result.blockedCount || 0
        });
      });
    }
  }, []);

  const toggleProtection = () => {
    const newState = !isProtected;
    setIsProtected(newState);
    // Save state to Chrome storage so content script knows what to do
    if (window.chrome && window.chrome.storage) {
      window.chrome.storage.local.set({ protectionEnabled: newState });
    }
  };

  return (
    <div className="w-[350px] min-h-[500px] bg-gray-50 p-4">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-800">Welcome To Soufiane's Child Safety App</h1>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-bold ${isProtected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isProtected ? 'ACTIVE' : 'DISABLED'}
        </div>
      </div>

      {/* Main Status Card */}
      <div className={`relative rounded-2xl p-6 mb-6 transition-all duration-300 ${isProtected ? 'bg-indigo-600 shadow-indigo-200' : 'bg-gray-200'} shadow-xl text-center`}>
        <div className="absolute top-4 right-4 animate-pulse">
           {isProtected && <Activity className="w-5 h-5 text-indigo-300" />}
        </div>
        
        <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
           {isProtected ? (
             <Shield className="w-10 h-10 text-white" />
           ) : (
             <Power className="w-10 h-10 text-gray-500" />
           )}
        </div>
        
        <h2 className={`text-2xl font-bold mb-1 ${isProtected ? 'text-white' : 'text-gray-600'}`}>
          {isProtected ? 'You are Protected' : 'Protection Paused'}
        </h2>
        <p className={`text-sm ${isProtected ? 'text-indigo-100' : 'text-gray-500'}`}>
          {isProtected ? 'Gemini AI is scanning your images' : 'Turn on to filter Harmful images'}
        </p>

        {/* Toggle Button */}
        <button 
          onClick={toggleProtection}
          className={`mt-6 w-full py-3 rounded-xl font-bold transition-transform active:scale-95 ${
            isProtected 
              ? 'bg-white text-indigo-600 hover:bg-gray-50' 
              : 'bg-gray-800 text-white hover:bg-gray-900'
          }`}
        >
          {isProtected ? 'Pause Protection' : 'Enable Protection'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Images Scanned</p>
          <div className="flex items-end gap-2 mt-1">
             <span className="text-2xl font-bold text-gray-800">{stats.scanned}</span>
             <Activity className="w-4 h-4 text-green-500 mb-1.5" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Images Blocked</p>
          <div className="flex items-end gap-2 mt-1">
             <span className="text-2xl font-bold text-gray-800">{stats.blocked}</span>
             <AlertTriangle className="w-4 h-4 text-red-500 mb-1.5" />
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
          <CheckCircle className="w-3 h-3" /> Powered by Google Gemini 3 Flash Preview
        </p>
      </div>
    </div>
  );
}

export default App;