/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppTab } from './types/audio';
import { AudioEngine } from './audio/AudioEngine';
import { LiquidHeader } from './components/LiquidHeader';
import { BottomTabBar } from './components/BottomTabBar';
import { FxRackView } from './components/FxRackView';
import { SamplerPadView } from './components/SamplerPadView';
import { PianoView } from './components/PianoView';
import { ReferenceLabView } from './components/ReferenceLabView';
import { SystemTunerView } from './components/SystemTunerView';
import { ProDspLabView } from './components/ProDspLabView';
import { QuickExportModal } from './components/QuickExportModal';
import { PcTranslatorModal } from './components/PcTranslatorModal';
import { CloudOffloadModal } from './components/CloudOffloadModal';
import { NavigationSoundEngine } from './audio/dsp/navigationSoundEngine';
import { Volume2, Sparkles, Smartphone, Layers, Zap } from 'lucide-react';

export default function App() {
  const engine = AudioEngine.getInstance();
  const [currentTab, setCurrentTab] = useState<AppTab>('fx-rack');
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  const [isQuickExportOpen, setIsQuickExportOpen] = useState(false);
  const [isTranslatorOpen, setIsTranslatorOpen] = useState(false);
  const [isCloudOpen, setIsCloudOpen] = useState(false);
  const [isMobileFrame, setIsMobileFrame] = useState(false);

  const handleSelectTab = (tab: AppTab) => {
    NavigationSoundEngine.getInstance().playTabShift(tab !== currentTab);
    setCurrentTab(tab);
  };

  // Initialize Web Audio upon first user interaction
  const handleStartAudioEngine = async () => {
    const success = await engine.initAudio();
    if (success) {
      setIsAudioStarted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col items-center justify-start selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Bar Header */}
      <LiquidHeader
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenQuickExport={() => setIsQuickExportOpen(true)}
        onOpenCloudModal={() => setIsCloudOpen(true)}
        onOpenTranslatorModal={() => setIsTranslatorOpen(true)}
        isMobileFrame={isMobileFrame}
        onToggleFrame={() => setIsMobileFrame((prev) => !prev)}
      />

      {/* Main Container */}
      <main
        className={`w-full flex-1 transition-all duration-300 py-4 px-3 sm:px-4 ${
          isMobileFrame
            ? 'max-w-[430px] my-4 rounded-[42px] border-[6px] border-slate-800 bg-[#090d16] shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden relative'
            : 'max-w-4xl'
        }`}
      >
        {/* Mobile Dynamic Island when framed */}
        {isMobileFrame && (
          <div className="w-24 h-5 bg-black rounded-full mx-auto mb-3 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 ring-1 ring-slate-800 mr-2" />
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/80 animate-pulse" />
          </div>
        )}

        {/* Audio Engine Startup Banner (If not yet clicked) */}
        {!isAudioStarted && (
          <div className="mb-4 rounded-2xl bg-gradient-to-r from-cyan-950/70 via-slate-900/80 to-purple-950/70 border border-cyan-500/30 p-3.5 backdrop-blur-xl flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                <Volume2 className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <span>AudioWorklet DSP Thread Ready</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Tap anywhere to activate zero-latency audio engine & 60fps telemetry
                </div>
              </div>
            </div>

            <button
              onClick={handleStartAudioEngine}
              className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/30 active:scale-95 transition-all whitespace-nowrap"
            >
              Activate Engine
            </button>
          </div>
        )}

        {/* Active View Switcher */}
        {currentTab === 'fx-rack' && (
          <FxRackView
            onOpenTranslator={() => setIsTranslatorOpen(true)}
            onOpenQuickExport={() => setIsQuickExportOpen(true)}
          />
        )}

        {currentTab === 'pro-dsp-lab' && <ProDspLabView />}

        {currentTab === 'sampler' && <SamplerPadView />}

        {currentTab === 'piano' && <PianoView />}

        {currentTab === 'reference-lab' && (
          <ReferenceLabView
            onOpenTranslator={() => setIsTranslatorOpen(true)}
            onOpenQuickExport={() => setIsQuickExportOpen(true)}
          />
        )}

        {currentTab === 'system-tuner' && <SystemTunerView />}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <BottomTabBar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenQuickExport={() => setIsQuickExportOpen(true)}
      />

      {/* Persistent Quick Export Modal */}
      <QuickExportModal
        isOpen={isQuickExportOpen}
        onClose={() => setIsQuickExportOpen(false)}
      />

      {/* Desktop PC Translator Modal */}
      <PcTranslatorModal
        isOpen={isTranslatorOpen}
        onClose={() => setIsTranslatorOpen(false)}
        onApplyPreset={() => {}}
      />

      {/* Hybrid Cloud Offload Modal */}
      <CloudOffloadModal
        isOpen={isCloudOpen}
        onClose={() => setIsCloudOpen(false)}
      />
    </div>
  );
}
