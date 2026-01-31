import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Globe, Database, Settings, Plus, Search, Terminal, AlertCircle, PlayCircle, Square, MoreVertical, Loader, X, Eraser, ChevronUp, ChevronDown, Activity } from 'lucide-react';
import { DashboardHome } from './components/DashboardHome';
import { ScraperBuilder } from './components/ScraperBuilder';
import { MOCK_SCRAPERS, MOCK_PRODUCTS, MOCK_LOGS, MOCK_STATS } from './constants';
import { ScraperConfig, Product, SiteStrategy, ScraperStatus, JobLog } from './types';

type View = 'dashboard' | 'scrapers' | 'products' | 'settings' | 'builder';
type LogMessage = { timestamp: string, message: string, type: 'info' | 'success' | 'error' };

// Utility for realistic delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [scrapers, setScrapers] = useState<ScraperConfig[]>(MOCK_SCRAPERS);
  const [editingScraperId, setEditingScraperId] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<JobLog[]>(MOCK_LOGS);

  // Console State
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<LogMessage[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Execution Control
  const runningScrapersRef = useRef<Set<string>>(new Set());
  // Track if we are in fallback mode (simulation) or real mode
  const [isBackendAvailable, setIsBackendAvailable] = useState<boolean | null>(null);

  // Computed state for active jobs
  const activeJobsCount = scrapers.filter(s => s.status === ScraperStatus.RUNNING).length;

  useEffect(() => {
    if (isConsoleOpen && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs, isConsoleOpen]);

  // Check backend health on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/health', { method: 'GET', signal: AbortSignal.timeout(2000) });
        if (res.ok) setIsBackendAvailable(true);
        else setIsBackendAvailable(false);
      } catch (e) {
        setIsBackendAvailable(false);
      }
    };
    checkBackend();
  }, []);

  const handleSaveScraper = (config: any) => {
    if (editingScraperId) {
      setScrapers(prev => prev.map(s => s.id === editingScraperId ? { ...s, ...config } : s));
    } else {
      const newScraper: ScraperConfig = {
        id: Math.random().toString(36).substr(2, 9),
        status: ScraperStatus.IDLE,
        lastRun: null,
        productsCount: 0,
        ...config
      };
      setScrapers([...scrapers, newScraper]);
    }
    setCurrentView('scrapers');
    setEditingScraperId(null);
  };

  const handleEditScraper = (id: string) => {
    setEditingScraperId(id);
    setCurrentView('builder');
  };

  const handleStopScraper = (id: string) => {
    // Remove from the set, effectively signaling the async loop to stop
    if (runningScrapersRef.current.has(id)) {
        runningScrapersRef.current.delete(id);
        const scraperName = scrapers.find(s => s.id === id)?.name || 'Unknown';
        setConsoleLogs(prev => [...prev, {
            timestamp: new Date().toLocaleTimeString(),
            message: `[System] Stopping scraper agent for ${scraperName}...`,
            type: 'error'
        }]);
    }
  };

  const handleRunScraper = async (id: string) => {
    const scraper = scrapers.find(s => s.id === id);
    if (!scraper || scraper.status === ScraperStatus.RUNNING) return;

    // 1. Open Console & Set Running
    setIsConsoleOpen(true);
    setScrapers(prev => prev.map(s => s.id === id ? { ...s, status: ScraperStatus.RUNNING } : s));
    runningScrapersRef.current.add(id);

    const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
      setConsoleLogs(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        message: msg,
        type
      }]);
    };

    // Helper to throw if stopped
    const checkActive = () => {
        if (!runningScrapersRef.current.has(id)) {
            throw new Error('STOPPED');
        }
    };

    try {
      checkActive();
      
      if (isBackendAvailable) {
        // --- REAL BACKEND MODE ---
        addLog(`[System] Connected to backend server. Dispatching job...`, 'info');
        
        try {
            const response = await fetch('http://localhost:3001/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: scraper.id,
                    url: scraper.baseUrl,
                    strategy: scraper.strategy,
                    selectors: scraper.selectors
                })
            });

            if (!response.ok) throw new Error('Server returned error');

            const result = await response.json();
            checkActive(); // Check if stopped while waiting

            if (result.success) {
                // Ingest logs from server
                if (result.log && Array.isArray(result.log)) {
                    result.log.forEach((l: string) => addLog(l, 'info'));
                }
                addLog(`[Server] Job finished. Scraped ${result.count} items.`, 'success');
                
                // Update State
                setScrapers(prev => prev.map(s => s.id === id ? { 
                    ...s, 
                    status: ScraperStatus.IDLE,
                    lastRun: new Date().toISOString(),
                    productsCount: (s.productsCount || 0) + result.count
                } : s));

                setRecentLogs(prev => [{
                    id: Math.random().toString(36),
                    scraperId: scraper.id,
                    scraperName: scraper.name,
                    startTime: new Date().toISOString(),
                    duration: 'Realtime',
                    itemsScraped: result.count,
                    status: 'SUCCESS'
                }, ...prev]);
            } else {
                throw new Error('Scrape job failed on server');
            }
        } catch (e: any) {
             if (e.message === 'STOPPED') throw e;
             addLog(`[Error] Backend failure: ${e.message}. Falling back to simulation...`, 'error');
             throw new Error('FALLBACK_NEEDED'); 
        }

      } else {
         // Force fallback if health check failed initially
         throw new Error('FALLBACK_NEEDED');
      }

    } catch (error: any) {
        // --- SIMULATION FALLBACK MODE ---
        if (error.message === 'FALLBACK_NEEDED' || !isBackendAvailable) {
            try {
                if (runningScrapersRef.current.has(id)) {
                    addLog(`[System] Backend unavailable (localhost:3001). Starting realistic simulation...`, 'info');
                    await runSimulation(scraper, id, addLog, checkActive);
                }
            } catch (simError: any) {
                if (simError.message === 'STOPPED') {
                    addLog(`[${scraper.name}] Process stopped by user request.`, 'error');
                    setScrapers(prev => prev.map(s => s.id === id ? { ...s, status: ScraperStatus.IDLE } : s));
                } else {
                     addLog(`[${scraper.name}] Simulation Error`, 'error');
                     setScrapers(prev => prev.map(s => s.id === id ? { ...s, status: ScraperStatus.ERROR } : s));
                }
            }
        } else if (error.message === 'STOPPED') {
            addLog(`[${scraper.name}] Process stopped by user request.`, 'error');
            setScrapers(prev => prev.map(s => s.id === id ? { ...s, status: ScraperStatus.IDLE } : s));
        } else {
            addLog(`[${scraper.name}] Critical Error`, 'error');
            setScrapers(prev => prev.map(s => s.id === id ? { ...s, status: ScraperStatus.ERROR } : s));
        }
    } finally {
        runningScrapersRef.current.delete(id);
    }
  };

  // Separation of the simulation logic for cleanliness
  const runSimulation = async (scraper: ScraperConfig, id: string, addLog: any, checkActive: any) => {
      addLog(`[${scraper.name}] Resolving DNS for ${scraper.baseUrl}...`, 'info');
      await delay(600);
      checkActive();
      
      addLog(`[${scraper.name}] Connecting to endpoint...`, 'info');
      await delay(1200);
      checkActive();

      addLog(`[${scraper.name}] Connection established (Latency: ${Math.floor(Math.random() * 50) + 20}ms)`, 'success');
      
      if (scraper.strategy === SiteStrategy.DYNAMIC) {
        addLog(`[${scraper.name}] Booting headless browser instance (Playwright)...`, 'info');
        await delay(1500);
        checkActive();
        addLog(`[${scraper.name}] Browser ready. Navigating to target...`, 'info');
        await delay(1000);
      } else if (scraper.strategy === SiteStrategy.API) {
         addLog(`[${scraper.name}] Authenticating with API token...`, 'info');
         await delay(800);
      }

      checkActive();
      addLog(`[${scraper.name}] Analyzing DOM structure for selector: '${scraper.selectors.productContainer}'`, 'info');
      await delay(1000);

      const pages = 3; 
      let totalExtracted = 0;
      
      for(let i=1; i<=pages; i++) {
        checkActive();
        addLog(`[${scraper.name}] Scraping page ${i} of ${pages}...`, 'info');
        await delay(800 + Math.random() * 1000);
        
        checkActive();
        const found = 10 + Math.floor(Math.random() * 25);
        totalExtracted += found;
        addLog(`[${scraper.name}] Page ${i}: Successfully extracted ${found} items`, 'success');
        
        if (Math.random() > 0.7) {
            checkActive();
            addLog(`[${scraper.name}] Rate limit safeguard triggered: Pausing for 1.5s...`, 'info');
            await delay(1500);
        }
      }
      
      checkActive();
      addLog(`[${scraper.name}] Normalizing ${totalExtracted} records to unified schema...`, 'info');
      await delay(800);
      
      addLog(`[${scraper.name}] Data pipeline commit successful. Job complete.`, 'success');

      setScrapers(prev => prev.map(s => s.id === id ? { 
        ...s, 
        status: ScraperStatus.IDLE,
        lastRun: new Date().toISOString(),
        productsCount: (s.productsCount || 0) + totalExtracted
      } : s));

      setRecentLogs(prev => [{
        id: Math.random().toString(36),
        scraperId: scraper.id,
        scraperName: scraper.name,
        startTime: new Date().toISOString(),
        duration: '0m 45s',
        itemsScraped: totalExtracted,
        status: 'SUCCESS'
      }, ...prev]);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 z-20 shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Globe size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Nexus</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors ${currentView === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={18} className="mr-3" />
            Dashboard
          </button>
          <button 
             onClick={() => setCurrentView('scrapers')}
             className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors ${currentView === 'scrapers' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}
          >
            <Terminal size={18} className="mr-3" />
            Scrapers
          </button>
          <button 
             onClick={() => setCurrentView('products')}
             className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors ${currentView === 'products' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}
          >
            <Database size={18} className="mr-3" />
            Data Warehouse
          </button>
          <button 
             onClick={() => setCurrentView('settings')}
             className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors ${currentView === 'settings' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}
          >
            <Settings size={18} className="mr-3" />
            Settings
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <button 
            onClick={() => setIsConsoleOpen(!isConsoleOpen)}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors ${isConsoleOpen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <div className="flex items-center">
               <Terminal size={16} className="mr-2" />
               Live Console
            </div>
            {isConsoleOpen ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
          </button>
          
          <div className="flex items-center p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className={`w-2 h-2 rounded-full mr-2 ${isBackendAvailable ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}></div>
            <span className="text-xs font-mono text-slate-400">
                {isBackendAvailable ? 'Backend Connected' : 'Simulation Mode'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-slate-800 capitalize">
                {currentView === 'builder' ? (editingScraperId ? 'Edit Scraper' : 'New Scraper') : currentView}
            </h1>
            {activeJobsCount > 0 && (
                <span className="flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-100 animate-pulse">
                    <Activity size={12} className="mr-1" />
                    {activeJobsCount} Running
                </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search products..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
              />
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              JD
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-auto p-8 pb-32">
          
          {currentView === 'dashboard' && (
            <DashboardHome stats={MOCK_STATS} recentLogs={recentLogs} />
          )}

          {currentView === 'scrapers' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <p className="text-slate-500">Manage active scraping agents and schedules.</p>
                 <button 
                  onClick={() => { setEditingScraperId(null); setCurrentView('builder'); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center font-medium shadow-md transition-all"
                >
                   <Plus size={18} className="mr-2" />
                   New Scraper
                 </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scrapers.map(scraper => (
                  <div key={scraper.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 relative group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          scraper.strategy === SiteStrategy.STATIC ? 'bg-orange-100 text-orange-600' :
                          scraper.strategy === SiteStrategy.DYNAMIC ? 'bg-purple-100 text-purple-600' :
                          'bg-cyan-100 text-cyan-600'
                        }`}>
                          <Globe size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">{scraper.name}</h3>
                          <p className="text-xs text-slate-500">{scraper.baseUrl}</p>
                        </div>
                      </div>
                      <div className="relative">
                         <button className="text-slate-400 hover:text-slate-600">
                           <MoreVertical size={16} />
                         </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Products</p>
                        <p className="font-semibold text-slate-800">{scraper.productsCount.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg">
                         <p className="text-xs text-slate-500 mb-1">Status</p>
                         <div className="flex items-center">
                            <span className={`w-2 h-2 rounded-full mr-2 ${
                              scraper.status === ScraperStatus.RUNNING ? 'bg-green-500 animate-pulse' :
                              scraper.status === ScraperStatus.IDLE ? 'bg-slate-400' : 'bg-yellow-500'
                            }`} />
                            <p className="font-semibold text-slate-800 text-xs">{scraper.status}</p>
                         </div>
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => handleEditScraper(scraper.id)}
                        disabled={scraper.status === ScraperStatus.RUNNING}
                        className="flex-1 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                      >
                        Configure
                      </button>
                      
                      {scraper.status === ScraperStatus.RUNNING ? (
                        <button 
                            onClick={() => handleStopScraper(scraper.id)}
                            className="flex-1 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center transition-colors shadow-sm"
                        >
                            <Square size={16} className="fill-current mr-2" />
                            Stop
                        </button>
                      ) : (
                        <button 
                            onClick={() => handleRunScraper(scraper.id)}
                            className="flex-1 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center justify-center transition-colors"
                        >
                            <PlayCircle size={16} className="mr-2" />
                            Run Now
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'builder' && (
            <ScraperBuilder 
              onSave={handleSaveScraper} 
              onCancel={() => setCurrentView('scrapers')}
              initialData={scrapers.find(s => s.id === editingScraperId)}
            />
          )}

          {currentView === 'products' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800">Product Index</h2>
                <div className="flex space-x-2">
                  <button className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-600 hover:text-slate-800">Export CSV</button>
                </div>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm text-slate-600">
                   <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                     <tr>
                       <th className="px-6 py-4">Product Name</th>
                       <th className="px-6 py-4">Price (FJD)</th>
                       <th className="px-6 py-4">Store</th>
                       <th className="px-6 py-4">Category</th>
                       <th className="px-6 py-4">Status</th>
                       <th className="px-6 py-4">Last Scraped</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {MOCK_PRODUCTS.map(product => (
                       <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                         <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>
                         <td className="px-6 py-4 text-emerald-600 font-bold">${product.price.toFixed(2)}</td>
                         <td className="px-6 py-4">
                           <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                             {product.store}
                           </span>
                         </td>
                         <td className="px-6 py-4 text-slate-500">{product.category}</td>
                         <td className="px-6 py-4">
                           {product.availability ? (
                             <span className="flex items-center text-green-600 text-xs font-medium">
                               <div className="w-1.5 h-1.5 rounded-full bg-green-600 mr-2"></div> In Stock
                             </span>
                           ) : (
                             <span className="flex items-center text-red-500 text-xs font-medium">
                               <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2"></div> OOS
                             </span>
                           )}
                         </td>
                         <td className="px-6 py-4 text-slate-400 text-xs">
                           {new Date(product.lastUpdated).toLocaleDateString()}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {currentView === 'settings' && (
             <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                  <Settings size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Global configuration, proxy rotation, and user management.</p>
                </div>
             </div>
          )}
        </div>
      </main>

      {/* Console Drawer - Fixed to screen bottom to ensure visibility */}
      {isConsoleOpen && (
          <div className="fixed bottom-0 right-0 left-64 bg-slate-900 text-slate-300 h-72 border-t border-slate-700 shadow-2xl flex flex-col z-[100] font-mono text-sm transition-transform duration-300">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                  <span className="flex items-center text-xs uppercase font-bold tracking-wider text-slate-400">
                      <Terminal size={14} className="mr-2" /> Live Execution Logs
                  </span>
                  <div className="flex space-x-2">
                       <button onClick={() => setConsoleLogs([])} className="p-1 hover:text-white rounded hover:bg-slate-700" title="Clear Logs"><Eraser size={14}/></button>
                       <button onClick={() => setIsConsoleOpen(false)} className="p-1 hover:text-white rounded hover:bg-slate-700" title="Close"><X size={14}/></button>
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-slate-900 font-mono text-xs">
                  {consoleLogs.length === 0 && <span className="text-slate-600 italic">Waiting for job to start...</span>}
                  {consoleLogs.map((log, i) => (
                      <div key={i} className="flex space-x-3 hover:bg-slate-800/50 -mx-4 px-4 py-0.5 border-l-2 border-transparent hover:border-blue-500">
                          <span className="text-slate-500 w-20 flex-shrink-0 select-none">{log.timestamp}</span>
                          <span className={`flex-1 break-all ${
                              log.type === 'success' ? 'text-green-400' : 
                              log.type === 'error' ? 'text-red-400 font-bold' : 'text-slate-300'
                          }`}>
                              {log.message}
                          </span>
                      </div>
                  ))}
                  <div ref={consoleEndRef} />
              </div>
          </div>
      )}
    </div>
  );
}

export default App;