import React, { useState } from 'react';
import { useStore } from '../store';
import { ShieldCheck, Activity, Terminal, ChevronDown } from 'lucide-react';

export const NetworkFlow: React.FC = () => {
  const { rawPackets, connectedRelays } = useStore();
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute right-6 top-6 glass-panel px-5 py-3 flex items-center gap-3 z-10 hover:bg-white/10 transition-all border border-neon-blue/30 text-neon-blue shadow-[0_0_20px_rgba(0,240,255,0.15)] pointer-events-auto cursor-pointer rounded-xl group animate-fade-in"
      >
        <Activity size={18} className="animate-pulse group-hover:scale-110 transition-transform" />
        <span className="text-xs font-bold font-mono tracking-widest uppercase">Network Monitor</span>
      </button>
    );
  }

  return (
    <div className="absolute right-6 top-6 bottom-6 w-96 glass-panel flex flex-col p-0 z-10 pointer-events-auto animate-slide-in-right overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-black/50 p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="text-neon-blue" size={18} />
          <h2 className="text-sm font-bold text-white tracking-widest font-mono uppercase">Packet Flow</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-neon-blue/10 px-2 py-1 rounded border border-neon-blue/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-blue opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-blue"></span>
            </span>
            <span className="text-[10px] text-neon-blue font-mono uppercase tracking-wider">Connected ({connectedRelays})</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white hover:bg-white/10 transition-colors p-1.5 rounded"
            title="Minimize Panel"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* Network Mesh Visualization */}
      <div className="h-32 bg-black/80 border-b border-white/10 flex items-center justify-center relative overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, #00F0FF 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
          animation: 'pulse 4s infinite alternate'
        }}></div>
        <div className="text-center z-10 relative">
          <p className="text-neon-blue text-xs font-mono font-bold tracking-widest uppercase animate-pulse mb-2">Relay Mesh Active</p>
          <div className="flex flex-col gap-1">
            <p className="text-gray-400 text-[10px] font-mono bg-black/60 px-2 py-0.5 rounded border border-white/5">wss://relay.damus.io</p>
            <p className="text-gray-400 text-[10px] font-mono bg-black/60 px-2 py-0.5 rounded border border-white/5">wss://nos.lol</p>
          </div>
        </div>
        {/* Scanning line effect */}
        <div className="absolute top-0 left-0 w-full h-1 bg-neon-blue/30 blur-[2px] animate-[scan_3s_linear_infinite]" style={{
          boxShadow: '0 0 10px 2px rgba(0, 240, 255, 0.4)'
        }}></div>
      </div>

      {/* Control Bar */}
      <div className="bg-black/30 px-4 py-2 border-b border-white/5 flex items-center justify-between text-[10px] text-gray-500 font-mono tracking-wider shrink-0">
        <span>&gt; LIVE_STREAM</span>
        <span>PACKETS: {rawPackets.length}</span>
      </div>

      {/* Packet Inspector */}
      <div className="flex-1 bg-[#050505]/80 overflow-y-auto p-4 font-mono text-[11px] flex flex-col gap-3 scroll-smooth">
        {rawPackets.map((packet, i) => (
          <div key={i} className="bg-black p-3 rounded-lg border border-white/10 relative overflow-hidden group shrink-0 hover:border-neon-blue/30 transition-colors shadow-sm">
            {packet.isVerified && (
              <div className="absolute top-0 right-0 bg-neon-green/10 text-neon-green px-2 py-1 rounded-bl-lg flex items-center gap-1 z-10 border-l border-b border-neon-green/20">
                <ShieldCheck size={12} />
                <span className="text-[9px] font-bold tracking-wider">VERIFIED</span>
              </div>
            )}
            {/* Kind 1984 Badge */}
            {packet.kind === 1984 && (
              <div className="absolute top-0 right-0 bg-neon-pink/10 text-neon-pink px-2 py-1 rounded-bl-lg flex items-center gap-1 z-10 border-l border-b border-neon-pink/20">
                <span className="text-[9px] font-bold tracking-wider">REPORT (1984)</span>
              </div>
            )}

            <div className="text-gray-400 break-all leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">
              <span className="text-neon-pink">{"{"}</span><br />
              &nbsp;&nbsp;<span className="text-neon-blue">"id"</span>: <span className="text-green-300">"{packet.id ? packet.id.substring(0, 16) : 'unknown'}..."</span>,<br />
              &nbsp;&nbsp;<span className="text-neon-blue">"pubkey"</span>: <span className="text-green-300">"{packet.pubkey ? packet.pubkey.substring(0, 16) : 'unknown'}..."</span>,<br />
              &nbsp;&nbsp;<span className="text-neon-blue">"kind"</span>: <span className="text-purple-400">{packet.kind}</span>,<br />
              &nbsp;&nbsp;<span className="text-neon-blue">"content"</span>: <span className="text-green-300">"{packet.content || ''}"</span><br />
              <span className="text-neon-pink">{"}"}</span>
            </div>
            {/* Hover subtle glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/0 via-neon-blue/5 to-neon-blue/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          </div>
        ))}
        {rawPackets.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-3 opacity-50">
            <Activity size={24} className="animate-pulse" />
            <div className="italic tracking-widest text-xs uppercase">Listening for packets...</div>
          </div>
        )}
      </div>
      
      {/* CSS animation for scanner */}
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-10px); }
          100% { transform: translateY(140px); }
        }
      `}</style>
    </div>
  );
};
