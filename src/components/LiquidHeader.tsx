/**
 * AURA DSP - Liquid Glass Header & Navigation Bar
 * Adheres strictly to the 3-zone Top Bar Contract:
 * [Zone 1: Single text brand wordmark] - [Zone 2: View switchers] - [Zone 3: Persistent Quick Export CTA]
 */

import React from 'react';
import { AppTab } from '../types/audio';
import { Download, Cloud, Layers, Smartphone, Monitor } from 'lucide-react';

interface LiquidHeaderProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenQuickExport: () => void;
  onOpenCloudModal: () => void;
  onOpenTranslatorModal: () => void;
  isMobileFrame: boolean;
  onToggleFrame: () => void;
}

export const LiquidHeader: React.FC<LiquidHeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickExport,
  onOpenCloudModal,
  onOpenTranslatorModal,
  isMobileFrame,
  onToggleFrame
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#07090e]/85 backdrop-blur-xl border-b border-white/10 px-4 py-2.5 transition-all">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onSelectTab('fx-rack');
            }}
            className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5"
          >
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400 bg-clip-text text-transparent">
              AURA DSP
            </span>
          </a>
        </div>

        {/* Zone 2: Navigation Links / Views */}
        <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 overflow-x-auto max-w-full">
          <button
            onClick={() => onSelectTab('fx-rack')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'fx-rack'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            FX Rack
          </button>
          <button
            onClick={() => onSelectTab('pro-dsp-lab')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'pro-dsp-lab'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pro DSP Lab
          </button>
          <button
            onClick={() => onSelectTab('sampler')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'sampler'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sampler
          </button>
          <button
            onClick={() => onSelectTab('piano')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'piano'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Piano
          </button>
          <button
            onClick={() => onSelectTab('reference-lab')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'reference-lab'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ref Lab
          </button>
          <button
            onClick={() => onSelectTab('system-tuner')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'system-tuner'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            System Tuner
          </button>
        </nav>

        {/* Zone 3: Primary Actions (PC Translator, Cloud, Persistent Quick Export) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* PC Translator */}
          <button
            onClick={onOpenTranslatorModal}
            title="Desktop Preset Translator"
            className="p-2 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-colors hidden sm:flex items-center"
          >
            <Layers className="w-4 h-4 text-purple-400" />
          </button>

          {/* Cloud Offload */}
          <button
            onClick={onOpenCloudModal}
            title="Hybrid Cloud Offload"
            className="p-2 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-colors flex items-center"
          >
            <Cloud className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Frame Toggle */}
          <button
            onClick={onToggleFrame}
            title={isMobileFrame ? 'Expand to Studio Width' : 'Switch to iPhone 16 Pro Viewport'}
            className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-colors hidden md:flex items-center"
          >
            {isMobileFrame ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* PERSISTENT QUICK EXPORT BUTTON */}
          <button
            onClick={onOpenQuickExport}
            className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 hover:from-cyan-300 hover:to-teal-200 rounded-xl shadow-lg shadow-cyan-500/25 flex items-center gap-1.5 active:scale-95 transition-transform whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Quick Export</span>
          </button>
        </div>
      </div>
    </header>
  );
};
