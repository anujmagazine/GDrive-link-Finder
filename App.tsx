
import React, { useState, useEffect, useMemo } from 'react';
import { GDriveLink, Category } from './types';
import { analyzeLinkPurpose, findLinkWithAI } from './services/geminiService';
import { Plus, Search, Trash2, ExternalLink, Tag, Brain, Database, X, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const App: React.FC = () => {
  const [links, setLinks] = useState<GDriveLink[]>(() => {
    const saved = localStorage.getItem('drive_links');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiSearchOpen, setIsAiSearchOpen] = useState(false);
  
  // New Link Form
  const [newLink, setNewLink] = useState({ url: '', title: '', purpose: '' });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // AI Chat/Search
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isSearchingWithAi, setIsSearchingWithAi] = useState(false);

  useEffect(() => {
    localStorage.setItem('drive_links', JSON.stringify(links));
  }, [links]);

  const categories: Category[] = ['Work', 'Personal', 'Projects', 'Education', 'Other'];

  const filteredLinks = useMemo(() => {
    return links.filter(link => {
      const matchesSearch = 
        link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = activeCategory === 'All' || link.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [links, searchQuery, activeCategory]);

  const stats = useMemo(() => {
    return categories.map(cat => ({
      name: cat,
      count: links.filter(l => l.category === cat).length
    }));
  }, [links]);

  const handleAddLink = async () => {
    if (!newLink.url || !newLink.title) return;
    setIsAnalyzing(true);
    
    const analysis = await analyzeLinkPurpose(newLink.title, newLink.purpose);
    
    const link: GDriveLink = {
      id: crypto.randomUUID(),
      url: newLink.url,
      title: newLink.title,
      purpose: newLink.purpose,
      tags: analysis.tags,
      category: analysis.category,
      dateAdded: Date.now(),
    };

    setLinks(prev => [link, ...prev]);
    setNewLink({ url: '', title: '', purpose: '' });
    setIsModalOpen(false);
    setIsAnalyzing(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this link?')) {
      setLinks(prev => prev.filter(l => l.id !== id));
    }
  };

  const handleAiSearch = async () => {
    if (!aiQuery) return;
    setIsSearchingWithAi(true);
    const response = await findLinkWithAI(aiQuery, links);
    setAiResponse(response);
    setIsSearchingWithAi(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
            <Database size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">LinkKeeper</h1>
        </div>

        <nav className="space-y-1 mb-8">
          <button 
            onClick={() => setActiveCategory('All')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeCategory === 'All' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Filter size={18} />
            All Links
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeCategory === cat ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Tag size={18} />
              {cat}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Storage Insight</p>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats}>
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === activeCategory ? '#2563eb' : '#94a3b8'} />
                  ))}
                </Bar>
                <XAxis dataKey="name" hide />
                <Tooltip />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Your Drive Repository</h2>
            <p className="text-slate-500">Track and organize your valuable GDrive assets</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsAiSearchOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium border border-purple-200"
            >
              <Brain size={18} />
              Ask AI
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              <Plus size={18} />
              Add Link
            </button>
          </div>
        </header>

        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Search by title, tags, or purpose..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Link Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredLinks.length > 0 ? (
            filteredLinks.map(link => (
              <div key={link.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">{link.category}</span>
                    <h3 className="text-lg font-bold text-slate-800 line-clamp-1">{link.title}</h3>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleDelete(link.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                
                <p className="text-slate-600 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
                  {link.purpose || "No purpose specified."}
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {link.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-400">{new Date(link.dateAdded).toLocaleDateString()}</span>
                  <a 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-blue-600 text-sm font-semibold hover:underline"
                  >
                    Open Link
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Database size={32} />
              </div>
              <p className="text-slate-500 font-medium">No links found matching your criteria.</p>
            </div>
          )}
        </div>
      </main>

      {/* Add Link Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Store New Link</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Link URL</label>
                <input 
                  type="url"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="https://drive.google.com/..."
                  value={newLink.url}
                  onChange={e => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Title</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Q3 Financial Report"
                  value={newLink.title}
                  onChange={e => setNewLink(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Purpose / Context</label>
                <textarea 
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                  placeholder="Why are you saving this? AI will use this to categorize."
                  value={newLink.purpose}
                  onChange={e => setNewLink(prev => ({ ...prev, purpose: e.target.value }))}
                />
              </div>
              <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
                <Brain className="text-blue-600 shrink-0 mt-1" size={18} />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Our AI will analyze your description to automatically suggest tags and categories, making it easier to find later.
                </p>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:text-slate-800"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddLink}
                disabled={isAnalyzing || !newLink.url || !newLink.title}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold shadow-sm transition-all ${isAnalyzing ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {isAnalyzing ? 'AI is Thinking...' : 'Save Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Search Modal */}
      {isAiSearchOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-purple-50">
              <div className="flex items-center gap-2">
                <Brain className="text-purple-600" size={24} />
                <h3 className="text-xl font-bold text-purple-900">AI Knowledge Assistant</h3>
              </div>
              <button onClick={() => setIsAiSearchOpen(false)} className="text-purple-400 hover:text-purple-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-6 text-sm">
                Ask me about your links! For example: "Where is the design doc for the mobile app?" or "Find the spreadsheets related to taxation."
              </p>
              
              <div className="relative mb-6">
                <textarea 
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none h-32 resize-none"
                  placeholder="Type your natural language query..."
                  value={aiQuery}
                  onChange={e => setAiQuery(e.target.value)}
                />
                <button 
                  onClick={handleAiSearch}
                  disabled={isSearchingWithAi || !aiQuery}
                  className={`absolute right-3 bottom-3 p-2 rounded-lg transition-colors ${isSearchingWithAi ? 'bg-slate-200' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                >
                  <Search size={20} />
                </button>
              </div>

              {aiResponse && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-60 overflow-y-auto">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                      <Brain size={16} />
                    </div>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {aiResponse}
                    </div>
                  </div>
                </div>
              )}

              {isSearchingWithAi && (
                <div className="flex items-center justify-center py-10 gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-150"></div>
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce delay-300"></div>
                  <span className="text-sm font-medium text-slate-500 ml-2">AI is scanning your repository...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
