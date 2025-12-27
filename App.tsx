
import React, { useState, useEffect, useMemo } from 'react';
import { GDriveLink, Category } from './types';
import { generateMetadataFromKeywords, findLinkWithAI } from './services/geminiService';
import { Plus, Search, Trash2, ExternalLink, Tag, Brain, Database, X, Filter, Sparkles, Loader2, Wand2 } from 'lucide-react';
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
  const [linkUrl, setLinkUrl] = useState('');
  const [keywords, setKeywords] = useState('');
  const [generatedInfo, setGeneratedInfo] = useState<{ title: string, purpose: string, tags: string[], category: Category } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      const q = searchQuery.toLowerCase();
      return link.title.toLowerCase().includes(q) ||
             link.purpose.toLowerCase().includes(q) ||
             link.tags.some(t => t.toLowerCase().includes(q)) ||
             link.category.toLowerCase().includes(q);
    }).sort((a, b) => b.dateAdded - a.dateAdded);
  }, [links, searchQuery]);

  const stats = useMemo(() => {
    return categories.map(cat => ({
      name: cat,
      count: links.filter(l => l.category === cat).length
    }));
  }, [links]);

  const handleGenerateMetadata = async () => {
    if (!linkUrl || !keywords) return;
    setIsGenerating(true);
    const result = await generateMetadataFromKeywords(linkUrl, keywords);
    setGeneratedInfo(result);
    setIsGenerating(false);
  };

  const handleSaveLink = () => {
    if (!generatedInfo || !linkUrl) return;
    setIsSaving(true);
    
    const newEntry: GDriveLink = {
      id: crypto.randomUUID(),
      url: linkUrl,
      title: generatedInfo.title,
      purpose: generatedInfo.purpose,
      tags: generatedInfo.tags,
      category: generatedInfo.category,
      dateAdded: Date.now(),
    };

    setLinks(prev => [newEntry, ...prev]);
    resetForm();
    setIsModalOpen(false);
    setIsSaving(false);
  };

  const resetForm = () => {
    setLinkUrl('');
    setKeywords('');
    setGeneratedInfo(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Permanently remove this link from your library?')) {
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
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Brain size={26} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-800">Recall</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Never forget a link</p>
          </div>
        </div>

        <nav className="space-y-1.5 mb-10 flex-1">
          <button 
            onClick={() => setActiveCategory('All')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeCategory === 'All' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Filter size={18} />
            Everything
          </button>
          <div className="py-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-2">Categories</p>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeCategory === cat ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className={`w-2 h-2 rounded-full ${cat === 'Work' ? 'bg-blue-500' : cat === 'Projects' ? 'bg-purple-500' : cat === 'Education' ? 'bg-emerald-500' : cat === 'Personal' ? 'bg-orange-500' : 'bg-slate-300'}`} />
                {cat}
              </button>
            ))}
          </div>
        </nav>

        <div className="pt-6 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Distribution</p>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats}>
                <Bar dataKey="count" radius={[4, 4, 4, 4]}>
                  {stats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === activeCategory ? '#4f46e5' : '#e2e8f0'} />
                  ))}
                </Bar>
                <XAxis dataKey="name" hide />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Recall Library</h2>
            <p className="text-slate-500 font-medium">Your curated knowledge base of Google Drive links.</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsAiSearchOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-white text-indigo-600 rounded-2xl hover:bg-indigo-50 transition-all font-bold border-2 border-indigo-100 shadow-sm active:scale-95"
            >
              <Brain size={20} />
              AI Recall
            </button>
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-200 active:scale-95"
            >
              <Plus size={22} />
              Add Link
            </button>
          </div>
        </header>

        {/* Search Bar */}
        <div className="relative mb-12 max-w-2xl">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Quick filter by title, tag, or context..."
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 outline-none shadow-sm transition-all font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Link Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
          {filteredLinks.length > 0 ? (
            filteredLinks.map(link => (
              <div key={link.id} className="bg-white border border-slate-200 rounded-3xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-1.5 ${link.category === 'Work' ? 'bg-blue-500' : link.category === 'Projects' ? 'bg-purple-500' : link.category === 'Education' ? 'bg-emerald-500' : link.category === 'Personal' ? 'bg-orange-500' : 'bg-slate-300'}`} />
                
                <div className="flex justify-between items-start mb-6">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded-md">{link.category}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(link.dateAdded).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{link.title}</h3>
                  </div>
                  <button 
                    onClick={() => handleDelete(link.id)}
                    className="p-2 text-slate-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors shrink-0"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-3">
                  {link.purpose}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-8">
                  {link.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-indigo-50/50 text-indigo-500 text-[11px] font-bold rounded-lg border border-indigo-50">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="pt-6 border-t border-slate-100 flex items-center justify-end">
                  <a 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group/link inline-flex items-center gap-2 px-5 py-2.5 bg-slate-50 text-slate-700 text-sm font-bold rounded-xl hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-sm"
                  >
                    View Link
                    <ExternalLink size={16} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-32 text-center">
              <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                <Database size={48} />
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">Recall is empty</h4>
              <p className="text-slate-500 max-w-xs mx-auto">Add a new resource to start your digital memory collection.</p>
            </div>
          )}
        </div>
      </main>

      {/* Add Link Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl my-auto animate-in fade-in zoom-in duration-300 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-xl text-white">
                  <Plus size={20} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Add to Recall</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Link URL</label>
                  <input 
                    type="url"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium"
                    placeholder="Paste the Google Drive link here..."
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Key Highlights / Keywords</label>
                  <div className="relative">
                    <input 
                      type="text"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium pr-32"
                      placeholder="e.g. strategy doc, quarterly, q3"
                      value={keywords}
                      onChange={e => setKeywords(e.target.value)}
                    />
                    <button 
                      onClick={handleGenerateMetadata}
                      disabled={isGenerating || !linkUrl || !keywords}
                      className={`absolute right-2 top-2 bottom-2 px-4 rounded-xl flex items-center gap-2 font-bold text-sm transition-all ${isGenerating ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100'}`}
                    >
                      {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      Craft Entry
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-400 font-medium italic">Keywords help AI generate a description that's easier for you to search later.</p>
                </div>
              </div>

              {generatedInfo && (
                <div className="space-y-6 pt-8 border-t border-dashed border-slate-200 animate-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 w-fit">
                    <Wand2 size={16} />
                    <span className="text-xs font-black uppercase tracking-widest">AI Proposal Ready</span>
                  </div>

                  <div>
                    <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Generated Title</label>
                    <input 
                      type="text"
                      className="w-full px-5 py-4 bg-white border-2 border-indigo-100 rounded-2xl focus:border-indigo-400 outline-none transition-all font-bold text-slate-800"
                      value={generatedInfo.title}
                      onChange={e => setGeneratedInfo({...generatedInfo, title: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Searchable Description</label>
                    <textarea 
                      className="w-full px-5 py-4 bg-white border-2 border-indigo-100 rounded-2xl focus:border-indigo-400 outline-none transition-all font-medium text-slate-600 h-32 resize-none"
                      value={generatedInfo.purpose}
                      onChange={e => setGeneratedInfo({...generatedInfo, purpose: e.target.value})}
                    />
                    <p className="mt-2 text-xs text-slate-400">This detailed context is what the AI Search uses to recall this link.</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {generatedInfo.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 text-slate-500 font-bold hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveLink}
                disabled={isSaving || !generatedInfo}
                className={`px-8 py-3 rounded-2xl font-black shadow-lg transition-all active:scale-95 ${isSaving || !generatedInfo ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'}`}
              >
                {isSaving ? 'Filing...' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Search Modal */}
      {isAiSearchOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Brain size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">AI Recall Search</h3>
                  <p className="text-indigo-100 text-sm font-medium">Find links using natural language</p>
                </div>
              </div>
              <button onClick={() => setIsAiSearchOpen(false)} className="p-2 text-indigo-100 hover:text-white hover:bg-white/10 rounded-full transition-all">
                <X size={28} />
              </button>
            </div>
            
            <div className="p-10">
              <div className="relative mb-8">
                <textarea 
                  className="w-full pl-6 pr-14 py-6 bg-slate-50 border-2 border-slate-100 rounded-[28px] focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 focus:bg-white outline-none h-40 resize-none transition-all font-medium text-slate-700 text-lg shadow-inner"
                  placeholder="Describe what you're looking for, e.g. 'the spreadsheet for q3 budgets'..."
                  value={aiQuery}
                  onChange={e => setAiQuery(e.target.value)}
                />
                <button 
                  onClick={handleAiSearch}
                  disabled={isSearchingWithAi || !aiQuery}
                  className={`absolute right-4 bottom-4 p-4 rounded-2xl transition-all shadow-lg active:scale-90 ${isSearchingWithAi ? 'bg-slate-200' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}`}
                >
                  <Search size={24} />
                </button>
              </div>

              {isSearchingWithAi && (
                <div className="flex flex-col items-center justify-center py-10 gap-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce delay-200"></div>
                  </div>
                  <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Recalling Information...</span>
                </div>
              )}

              {aiResponse && !isSearchingWithAi && (
                <div className="bg-slate-50 border border-slate-200 rounded-[32px] p-8 max-h-[400px] overflow-y-auto animate-in fade-in duration-500 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
                      <Brain size={20} />
                    </div>
                    <div className="prose prose-slate prose-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
                      {aiResponse}
                    </div>
                  </div>
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
