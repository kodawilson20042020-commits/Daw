/**
 * AURA DSP - Mobile Ergonomic Bottom Tab Bar
 * Thumb-zone navigation for phone viewports (< 15% sticky height).
 */

import React from 'react';
import { AppTab } from '../types/audio';
import { Sliders, Grid3X3, Music, Download, Compass, Wrench, Cpu } from 'lucide-react';

interface BottomTabBarProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenQuickExport: () => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickExport
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#07090e]/90 backdrop-blur-2xl border-t border-white/10 px-1 py-1.5 flex items-center justify-around max-w-lg mx-auto sm:hidden pb-safe">
      <button
        onClick={() => onSelectTab('fx-rack')}
        className={`flex flex-col items-center justify-center min-w-[42px] min-h-[40px] transition-colors ${
          currentTab === 'fx-rack' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <Sliders className="w-4 h-4" />
        <span className="text-[9px] font-semibold mt-0.5">FX Rack</span>
      </button>

      <button
        onClick={() => onSelectTab('pro-dsp-lab')}
        className={`flex flex-col items-center justify-center min-w-[42px] min-h-[40px] transition-colors ${
          currentTab === 'pro-dsp-lab' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <Cpu className="w-4 h-4" />
        <span className="text-[9px] font-semibold mt-0.5">Pro Lab</span>
      </button>

      <button
        onClick={() => onSelectTab('sampler')}
        className={`flex flex-col items-center justify-center min-w-[42px] min-h-[40px] transition-colors ${
          currentTab === 'sampler' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <Grid3X3 className="w-4 h-4" />
        <span className="text-[9px] font-semibold mt-0.5">Sampler</span>
      </button>

      <button
        onClick={() => onSelectTab('piano')}
        className={`flex flex-col items-center justify-center min-w-[42px] min-h-[40px] transition-colors ${
          currentTab === 'piano' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <Music className="w-4 h-4" />
        <span className="text-[9px] font-semibold mt-0.5">Piano</span>
      </button>

      <button
        onClick={() => onSelectTab('reference-lab')}
        className={`flex flex-col items-center justify-center min-w-[42px] min-h-[40px] transition-colors ${
          currentTab === 'reference-lab' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <Compass className="w-4 h-4" />
        <span className="text-[9px] font-semibold mt-0.5">Ref Lab</span>
      </button>

      <button
        onClick={() => onSelectTab('system-tuner')}
        className={`flex flex-col items-center justify-center min-w-[42px] min-h-[40px] transition-colors ${
          currentTab === 'system-tuner' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <Wrench className="w-4 h-4" />
        <span className="text-[9px] font-semibold mt-0.5">Tuner</span>
      </button>

      <button
        onClick={onOpenQuickExport}
        className="flex flex-col items-center justify-center min-w-[40px] min-h-[40px] text-teal-300 hover:text-teal-200"
      >
        <div className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-md shadow-cyan-400/30">
          <Download className="w-3 h-3" />
        </div>
        <span className="text-[9px] font-semibold mt-0.5">Export</span>
      </button>
    </div>
  );
};
