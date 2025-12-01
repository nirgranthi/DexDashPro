import React, { useState, useEffect, useRef } from 'react';
import { Search, Github, ArrowRight, TrendingUp, DollarSign, Activity, Clock, AlertTriangle, X, ExternalLink, Copy, Download, FileJson, FileText, Printer } from 'lucide-react';

// --- Helper Functions ---

const formatCurrency = (value) => {
  if (!value && value !== 0) return '-';
  if (value >= 1000000000) return '$' + (value / 1000000000).toFixed(2) + 'B';
  if (value >= 1000000) return '$' + (value / 1000000).toFixed(2) + 'M';
  if (value >= 1000) return '$' + (value / 1000).toFixed(2) + 'K';
  return '$' + value.toFixed(2);
};

const formatPrice = (price) => {
  if (!price) return '-';
  const num = parseFloat(price);
  if (num < 0.0001) return '$' + num.toFixed(8);
  if (num < 1) return '$' + num.toFixed(6);
  return '$' + num.toFixed(2);
};

const formatAge = (timestamp) => {
  if (!timestamp) return 'Unknown';
  const created = new Date(timestamp);
  const now = new Date();
  const diffInHours = Math.abs(now - created) / 36e5;
  
  if (diffInHours < 1) return `${Math.floor(diffInHours * 60)} mins ago`;
  if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
  return `${Math.floor(diffInHours / 24)} days ago`;
};

// --- Export Functions ---

const downloadJSON = (pair) => {
  const analysisData = {
    meta: {
      timestamp: new Date().toISOString(),
      platform: "DexDash Pro",
      exported_by: "User",
      note: "Data suitable for AI Sentiment & Technical Analysis"
    },
    identity: {
      name: pair.baseToken.name,
      symbol: pair.baseToken.symbol,
      address: pair.baseToken.address,
      chain: pair.chainId,
      dex: pair.dexId,
      pair_address: pair.pairAddress,
      url: pair.url
    },
    market_metrics: {
      price_usd: pair.priceUsd,
      price_native: pair.priceNative,
      liquidity_usd: pair.liquidity?.usd,
      fdv: pair.fdv,
      market_cap: pair.marketCap
    },
    momentum_profile: {
      price_change: {
        m5: pair.priceChange.m5,
        h1: pair.priceChange.h1,
        h6: pair.priceChange.h6,
        h24: pair.priceChange.h24
      },
      volume: {
        h24: pair.volume.h24,
        h6: pair.volume.h6,
        h1: pair.volume.h1,
        m5: pair.volume.m5
      }
    },
    trader_behavior: {
      transactions_24h: {
        buys: pair.txns.h24.buys,
        sells: pair.txns.h24.sells,
        total: pair.txns.h24.buys + pair.txns.h24.sells,
        buy_pressure_ratio: (pair.txns.h24.buys / (pair.txns.h24.buys + pair.txns.h24.sells)).toFixed(4)
      }
    }
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(analysisData, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `${pair.baseToken.symbol}_ANALYSIS_${new Date().getTime()}.json`);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};

const downloadCSV = (pair) => {
  const headers = ["Metric", "Value", "Unit/Note"];
  const rows = [
    ["Symbol", pair.baseToken.symbol, "Identity"],
    ["Name", pair.baseToken.name, "Identity"],
    ["Address", pair.baseToken.address, "Contract"],
    ["Chain", pair.chainId, "Network"],
    ["Price USD", pair.priceUsd, "USD"],
    ["Liquidity", pair.liquidity?.usd, "USD"],
    ["FDV", pair.fdv, "USD"],
    ["24h Volume", pair.volume.h24, "USD"],
    ["24h Change", pair.priceChange.h24 + "%", "Percentage"],
    ["Txns Buys", pair.txns.h24.buys, "Count"],
    ["Txns Sells", pair.txns.h24.sells, "Count"],
    ["Pair Age", new Date(pair.pairCreatedAt).toLocaleDateString(), "Date"]
  ];

  let csvContent = "data:text/csv;charset=utf-8," 
    + headers.join(",") + "\n" 
    + rows.map(e => e.join(",")).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${pair.baseToken.symbol}_DATA.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const handlePrint = () => {
  window.print();
};

// --- Components ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-gray-800/50 border border-gray-700/50 backdrop-blur-sm rounded-xl p-4 ${className} print:border-gray-300 print:bg-white print:text-black`}>
    {children}
  </div>
);

const Badge = ({ children, type = 'neutral' }) => {
  const colors = {
    green: 'bg-green-500/10 text-green-400 border-green-500/20 print:text-green-700 print:border-green-700',
    red: 'bg-red-500/10 text-red-400 border-red-500/20 print:text-red-700 print:border-red-700',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    neutral: 'bg-gray-700/50 text-gray-300 border-gray-600/50',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[type]}`}>
      {children}
    </span>
  );
};

// --- Main Application ---

export default function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pairs, setPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState(null);
  const [view, setView] = useState('home'); 
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSelectedPair(null);
    setPairs([]);

    try {
      let apiUrl = `https://api.dexscreener.com/latest/dex/search/?q=${query.trim()}`;
      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!data.pairs || data.pairs.length === 0) {
        throw new Error("No tokens found. Try pasting a contract address.");
      }

      const validPairs = data.pairs.filter(p => p.liquidity && p.liquidity.usd > 100); 
      const sortedPairs = validPairs.sort((a, b) => b.liquidity.usd - a.liquidity.usd);

      if (sortedPairs.length === 0) setPairs(data.pairs);
      else setPairs(sortedPairs);

      setView('list');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectToken = (pair) => {
    setSelectedPair(pair);
    setView('detail');
  };

  const goBack = () => {
    setView('list');
    setSelectedPair(null);
  };

  const goHome = () => {
    setQuery('');
    setPairs([]);
    setSelectedPair(null);
    setView('home');
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-gray-100 font-sans selection:bg-blue-500/30 print:bg-white print:text-black">
      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full { width: 100% !important; height: auto !important; }
          body { background-color: white; color: black; }
        }
      `}</style>

      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-[#0b0e14]/80 backdrop-blur-md sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={goHome}>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Activity size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              DexDash
            </span>
          </div>
          
          <a href="https://github.com/nirgranthi" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
            <Github size={18} />
            <span className="hidden sm:inline">nirgranthi</span>
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Search Bar (Hidden in Print) */}
        <div className="max-w-3xl mx-auto mb-8 no-print">
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Token (Name, Symbol, Address)..."
              className="w-full bg-gray-900 border border-gray-800 text-white pl-12 pr-24 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-xl placeholder:text-gray-600"
            />
            <div className="absolute inset-y-2 right-2">
              <button type="submit" disabled={loading} className="h-full px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Load'}
              </button>
            </div>
          </form>
        </div>

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 animate-in fade-in slide-in-from-top-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400">
              <AlertTriangle size={20} />
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* HOME VIEW */}
        {view === 'home' && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500 no-print">
            <div className="w-20 h-20 bg-gray-800 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-black/50">
              <DollarSign size={40} className="text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Search for a Token</h2>
            <p className="text-gray-500 max-w-md">Start typing in the search bar above to find top tokens, new listings, or paste any contract address directly.</p>
          </div>
        )}

        {/* LIST VIEW */}
        {view === 'list' && pairs.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-8 no-print">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-300">Found {pairs.length} Pairs</h3>
              <span className="text-xs text-gray-500 uppercase tracking-wider">Sorted by Liquidity</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pairs.map((pair) => (
                <div key={pair.pairAddress} onClick={() => selectToken(pair)} className="bg-gray-800/40 hover:bg-gray-800 border border-gray-700/50 hover:border-blue-500/30 rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.01] group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden shrink-0 border border-gray-600">
                         <img src={pair.info?.imageUrl || 'https://cdn-icons-png.flaticon.com/512/12114/12114233.png'} alt={pair.baseToken.symbol} className="w-full h-full object-cover" onError={(e) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/12114/12114233.png'} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{pair.baseToken.symbol}</span>
                          <span className="text-gray-500 text-xs">/ {pair.quoteToken.symbol}</span>
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-1"><span className="capitalize">{pair.chainId}</span> • {pair.dexId}</div>
                      </div>
                    </div>
                    <Badge type={pair.priceChange.h24 >= 0 ? 'green' : 'red'}>{pair.priceChange.h24 > 0 ? '+' : ''}{pair.priceChange.h24}%</Badge>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Price</div>
                      <div className="text-lg font-mono font-medium text-white">{formatPrice(pair.priceUsd)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 mb-1">Liquidity</div>
                      <div className="text-sm font-mono text-gray-300">{formatCurrency(pair.liquidity?.usd)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DETAIL VIEW (Dashboard) */}
        {view === 'detail' && selectedPair && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between mb-4 gap-4 no-print">
              <button onClick={goBack} className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                <ArrowRight className="rotate-180" size={16} /> Back
              </button>
              
              <div className="flex gap-2">
                 <button onClick={() => downloadJSON(selectedPair)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm transition-colors" title="Download for AI Analysis">
                    <FileJson size={16} /> <span className="hidden sm:inline">JSON (AI)</span>
                 </button>
                 <button onClick={() => downloadCSV(selectedPair)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm transition-colors" title="Download for Excel">
                    <FileText size={16} /> <span className="hidden sm:inline">CSV</span>
                 </button>
                 <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors" title="Print Chart/Report">
                    <Printer size={16} /> <span className="hidden sm:inline">Print / PDF</span>
                 </button>
              </div>
            </div>

            {/* Header Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
              <Card className="lg:col-span-1 bg-gradient-to-br from-gray-800 to-gray-900 border-blue-500/20 print:border-black print:bg-white">
                <div className="flex items-center gap-4 mb-4">
                   <img src={selectedPair.info?.imageUrl || 'https://cdn-icons-png.flaticon.com/512/12114/12114233.png'} className="w-12 h-12 rounded-full border-2 border-gray-700 shadow-lg print:border-black" />
                   <div>
                      <h1 className="text-xl font-bold text-white print:text-black">{selectedPair.baseToken.name}</h1>
                      <div className="flex items-center gap-2 text-sm text-gray-400 print:text-gray-600">
                         <span className="font-mono bg-gray-800 px-1.5 rounded print:bg-gray-200">{selectedPair.baseToken.symbol}</span>
                         <span>On {selectedPair.chainId}</span>
                      </div>
                   </div>
                </div>
                
                <div className="space-y-3">
                   <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm print:text-black">Price USD</span>
                      <span className="text-2xl font-mono font-bold text-white tracking-tight print:text-black">{formatPrice(selectedPair.priceUsd)}</span>
                   </div>
                   
                   <div className="p-3 bg-black/20 rounded-lg border border-white/5 print:bg-gray-100 print:border-gray-300">
                      {['m5', 'h1', 'h24'].map(tf => (
                        <div key={tf} className="flex justify-between text-sm mb-1 last:mb-0">
                           <span className="text-gray-500 uppercase print:text-black">{tf}</span>
                           <span className={selectedPair.priceChange[tf] >= 0 ? 'text-green-400 print:text-green-700 font-bold' : 'text-red-400 print:text-red-700 font-bold'}>
                              {selectedPair.priceChange[tf]}%
                           </span>
                        </div>
                      ))}
                   </div>
                </div>
              </Card>

              {/* Stats Grid */}
              <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                 <Card><div className="text-gray-500 text-xs uppercase font-semibold mb-1 print:text-black">Liquidity</div><div className="text-xl font-mono text-white print:text-black">{formatCurrency(selectedPair.liquidity?.usd)}</div></Card>
                 <Card><div className="text-gray-500 text-xs uppercase font-semibold mb-1 print:text-black">FDV</div><div className="text-xl font-mono text-white print:text-black">{formatCurrency(selectedPair.fdv)}</div></Card>
                 <Card>
                    <div className="text-gray-500 text-xs uppercase font-semibold mb-1 print:text-black">Volume (24h)</div>
                    <div className="text-xl font-mono text-white print:text-black">{formatCurrency(selectedPair.volume?.h24)}</div>
                 </Card>
                 <Card>
                    <div className="text-gray-500 text-xs uppercase font-semibold mb-1 print:text-black">Created</div>
                    <div className="text-sm font-mono text-white print:text-black">{formatAge(selectedPair.pairCreatedAt)}</div>
                    <div className="text-[10px] text-gray-500 mt-1 truncate print:hidden">{selectedPair.pairAddress}</div>
                 </Card>
              </div>
            </div>

            {/* Chart Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[600px] print:h-[800px] print:block">
               <div className="lg:col-span-3 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-2xl relative print:border-black print:bg-white print:h-[500px] print:mb-4">
                  {/* Warning for Print View */}
                  <div className="hidden print:flex absolute inset-0 items-center justify-center bg-gray-100 text-gray-500 border-2 border-dashed border-gray-300 m-4">
                      [Chart Interactive View Not Available in Print - See JSON Data for History]
                  </div>
                  <iframe 
                     src={`https://dexscreener.com/${selectedPair.chainId}/${selectedPair.pairAddress}?embed=1&theme=dark&trades=0&info=0`}
                     className="w-full h-full border-0 print:hidden"
                     title="DexScreener Chart"
                  />
               </div>
               
               <div className="lg:col-span-1 flex flex-col gap-4 h-full overflow-y-auto pr-1 custom-scrollbar print:h-auto print:overflow-visible">
                  <Card className="flex-1">
                     <h3 className="text-white font-semibold mb-4 flex items-center gap-2 print:text-black">
                        <TrendingUp size={16} className="text-blue-400 print:text-black" /> Market Action
                     </h3>
                     <div className="space-y-4">
                        <div>
                           <div className="text-xs text-gray-500 mb-1 print:text-black">Buys vs Sells (24h)</div>
                           <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden print:bg-gray-300">
                              <div className="bg-green-500 h-full print:bg-black" style={{ width: `${(selectedPair.txns.h24.buys / (selectedPair.txns.h24.buys + selectedPair.txns.h24.sells)) * 100}%` }} />
                           </div>
                           <div className="flex justify-between text-xs mt-1 text-gray-300 print:text-black">
                              <span>{selectedPair.txns.h24.buys} Buys</span>
                              <span>{selectedPair.txns.h24.sells} Sells</span>
                           </div>
                        </div>
                        <div className="pt-4 border-t border-gray-700/50 print:border-gray-300">
                           <div className="text-xs text-gray-500 mb-2 print:text-black">Contract Address</div>
                           <div className="bg-black/30 p-2 rounded border border-gray-700 flex justify-between items-center group cursor-pointer print:bg-white print:border-black" onClick={() => navigator.clipboard.writeText(selectedPair.baseToken.address)}>
                                 <div className="truncate w-full text-xs text-gray-400 font-mono print:text-black select-all">{selectedPair.baseToken.address}</div>
                                 <Copy size={12} className="text-gray-600 group-hover:text-blue-400 print:hidden" />
                           </div>
                        </div>
                     </div>
                  </Card>
               </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-800 bg-[#0b0e14] py-8 mt-12 no-print">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm mb-2">DexDash Pro &copy; 2025</p>
          <div className="flex justify-center gap-4 text-sm text-gray-600">
             <a href="https://github.com/nirgranthi" className="hover:text-white transition-colors flex items-center gap-1"><Github size={14} /> Connect on GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}


