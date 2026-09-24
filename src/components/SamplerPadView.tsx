/**
 * AURA DSP - Real-Time Sampler & DAW Pad Suite
 * Features:
 * - Infinite Pad Banks Engine (2020s Drill, 2010s Trap, 90s Boom-Bap, 80s Electro, 70s Soul, + Infinite Custom Banks)
 * - Sample Ingestion Hub: YouTube / Web Audio URL fetch, Mic sampling, local file upload
 * - 16-Levels Melodic Pitch Tuning: Spreads any sample across 16 pads chromatically (-8 to +7 st)
 * - Sample Chop Editor: Pitch offset (-24 to +24 st), fine tuning, start/end trim %, and reverse
 * - Sound Pack Exporter: 1-click export for FL Studio (FPC), BandLab Sampler, and GarageBand (DMD)
 * - W3C Vibration API velocity-matched tactile haptic engine
 * - 16-step live quantization recording matrix with MPC swing and micro-timing jitter
 */

import React, { useState, useEffect, useRef } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import { HapticIntensity, SoundPackExportFormat, PadConfig, PadSampleSettings } from '../types/audio';
import {
  Play,
  Square,
  Sliders,
  RefreshCw,
  Vibrate,
  Circle,
  Repeat,
  Sparkles,
  Flame,
  Radio,
  Plus,
  Trash2,
  Download,
  Link,
  Mic,
  Upload,
  ArrowRightLeft,
  Volume2,
  Music,
  Check,
  Disc
} from 'lucide-react';

const STUDIO_PRESETS = [
  { key: 'punchy_kick', name: 'Punch Kick', tag: 'Kick' },
  { key: '808_sub', name: '808 Sub', tag: 'Sub' },
  { key: 'tape_sub_808', name: 'Tape 808', tag: 'Sub' },
  { key: 'crack_snare', name: 'Crack Snare', tag: 'Snare' },
  { key: 'sp1200_dirty_snare', name: 'SP1200 Snare', tag: 'Snare' },
  { key: 'closed_hat', name: 'Crisp Hat', tag: 'Hat' },
  { key: 'open_hat', name: 'Open Hat', tag: 'Hat' },
  { key: 'studio_clap', name: 'Studio Clap', tag: 'Clap' },
  { key: 'rimshot', name: 'Rimshot', tag: 'Perc' },
  { key: 'cowbell', name: '808 Bell', tag: 'Perc' },
  { key: 'shaker', name: 'Shaker', tag: 'Perc' },
  { key: 'vocal_chop', name: 'Vocal Chop', tag: 'Vocal' },
  { key: 'rhodes_chord', name: 'Rhodes Chord', tag: 'Keys' },
  { key: 'synth_pluck', name: 'Synth Pluck', tag: 'Synth' },
  { key: 'mpc_boombap_kick', name: 'MPC60 Kick', tag: 'Kick' },
  { key: 'vinyl_scratch', name: 'Vinyl FX', tag: 'FX' }
];

const DEMO_AUDIO_URLS = [
  { name: 'YouTube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { name: 'Spotify', url: 'https://open.spotify.com/track/4PTG3Z6ehGkBFwjybzWkR8' },
  { name: 'Apple', url: 'https://music.apple.com/us/album/never-gonna-give-you-up/1773292758?i=1773293184' }
];

export const SamplerPadView: React.FC = () => {
  const engine = AudioEngine.getInstance();
  const [banks, setBanks] = useState(engine.padBanks);
  const [activeBankId, setActiveBankId] = useState(engine.activeBankId);

  const [activePad, setActivePad] = useState<number | null>(null);
  const [selectedPadIndex, setSelectedPadIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(engine.isSequencerPlaying);
  const [isRecording, setIsRecording] = useState(false);
  const [currentStep, setCurrentStep] = useState(engine.currentStep);
  const [pattern, setPattern] = useState<boolean[][]>([...engine.drumPattern]);
  const [swing, setSwing] = useState(engine.grooveSettings.swingPercent);
  const [humanize, setHumanize] = useState(engine.grooveSettings.humanizeMs);
  const [tempo, setTempo] = useState(engine.grooveSettings.tempoBpm);
  const [hapticSetting, setHapticSetting] = useState<HapticIntensity>(engine.hapticIntensity);

  // Note repeat / Roll mode
  const [rollMode, setRollMode] = useState<boolean>(false);
  const [rollSpeed, setRollSpeed] = useState<'1/8' | '1/16' | '1/32' | '1/16T'>('1/16');
  const rollIntervalRef = useRef<number | null>(null);

  // Sample Ingestion & Chop Editor states
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [sampleUrlInput, setSampleUrlInput] = useState('');
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [isMicRecording, setIsMicRecording] = useState(false);
  const [sampleFeedbackMsg, setSampleFeedbackMsg] = useState<string | null>(null);
  const [sampleFeedbackType, setSampleFeedbackType] = useState<'success' | 'error' | 'info'>('info');

  // Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<SoundPackExportFormat>('fl_studio');
  const [isExporting, setIsExporting] = useState(false);

  // New Bank Modal state
  const [isNewBankModalOpen, setIsNewBankModalOpen] = useState(false);
  const [newBankName, setNewBankName] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentBank = engine.getActiveBank();
  const currentPad = currentBank?.padConfigs[selectedPadIndex] || currentBank?.padConfigs[0];

  // Sync sequencer step visualization
  useEffect(() => {
    let animId: number;
    const syncLoop = () => {
      setIsPlaying(engine.isSequencerPlaying);
      setCurrentStep(engine.currentStep);
      animId = requestAnimationFrame(syncLoop);
    };
    animId = requestAnimationFrame(syncLoop);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  const triggerPadWithHaptics = async (padId: number, velocity: number = 0.9) => {
    await engine.initAudio();
    engine.triggerPad(padId, velocity);

    setActivePad(padId);
    setSelectedPadIndex(padId);

    // Live recording stamp
    if (isRecording && engine.isSequencerPlaying) {
      const stepToRecord = engine.currentStep;
      setPattern((prev) => {
        const next = prev.map((row, rIdx) => {
          if (rIdx === padId) {
            const copy = [...row];
            copy[stepToRecord] = true;
            return copy;
          }
          return row;
        });
        engine.drumPattern = next;
        return next;
      });
    }

    setTimeout(() => setActivePad(null), 120);
  };

  const handlePointerDown = (padId: number, e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const velocity = 0.45 + relY * 0.65;

    triggerPadWithHaptics(padId, velocity);

    if (rollMode) {
      const bpm = engine.grooveSettings.tempoBpm;
      const beatMs = 60000 / bpm;
      const speedDiv = rollSpeed === '1/8' ? 2 : rollSpeed === '1/16' ? 4 : rollSpeed === '1/32' ? 8 : 6;
      const intervalMs = beatMs / speedDiv;

      rollIntervalRef.current = window.setInterval(() => {
        triggerPadWithHaptics(padId, velocity);
      }, intervalMs);
    }
  };

  const handlePointerUp = () => {
    if (rollIntervalRef.current !== null) {
      clearInterval(rollIntervalRef.current);
      rollIntervalRef.current = null;
    }
  };

  const handleToggleSequencer = async () => {
    await engine.initAudio();
    if (engine.isSequencerPlaying) {
      engine.stopSequencer();
      setIsPlaying(false);
      setIsRecording(false);
    } else {
      engine.startSequencer();
      setIsPlaying(true);
    }
  };

  const handleToggleStep = (stepIdx: number) => {
    const updated = pattern.map((row, pIdx) => {
      if (pIdx === selectedPadIndex) {
        const copy = [...row];
        copy[stepIdx] = !copy[stepIdx];
        return copy;
      }
      return row;
    });
    setPattern(updated);
    engine.drumPattern = updated;
  };

  const handleClearPattern = () => {
    const cleared = Array.from({ length: 16 }, () => Array(16).fill(false));
    setPattern(cleared);
    engine.drumPattern = cleared;
  };

  // --- BANK SWITCHING & CREATION ---
  const handleBankSelect = (bankId: string) => {
    engine.switchBank(bankId);
    setActiveBankId(bankId);
    setBanks([...engine.padBanks]);
  };

  const handleCreateBank = () => {
    if (!newBankName.trim()) return;
    const newBank = engine.createCustomBank(newBankName.trim());
    setBanks([...engine.padBanks]);
    setActiveBankId(newBank.id);
    setNewBankName('');
    setIsNewBankModalOpen(false);
  };

  // --- SAMPLE INGESTION ---
  const handleLoadFromUrl = async (customUrl?: string) => {
    const targetUrl = (customUrl || sampleUrlInput).trim();
    if (!targetUrl) return;
    setIsLoadingSample(true);
    setSampleFeedbackType('info');
    setSampleFeedbackMsg('Resolving link and decoding audio...');
    const res = await engine.loadSampleFromUrl(targetUrl, selectedPadIndex);
    setIsLoadingSample(false);
    if (res.success) {
      setSampleFeedbackType('success');
      setSampleFeedbackMsg(
        `Loaded "${res.sampleName || 'Sample'}" into Pad ${selectedPadIndex + 1} (${res.duration?.toFixed(2)}s)${res.note ? ` — ${res.note}` : ''}${res.audioUrl ? `\n${res.audioUrl}` : ''}`
      );
      setBanks([...engine.padBanks]);
      if (!customUrl) setSampleUrlInput('');
    } else {
      setSampleFeedbackType('error');
      setSampleFeedbackMsg(res.error || 'Failed to fetch or decode audio from URL.');
    }
  };

  const handleLoadPreset = async (sampleKey: string) => {
    setIsLoadingSample(true);
    setSampleFeedbackType('info');
    setSampleFeedbackMsg('Generating studio preset sample...');
    const res = await engine.loadPresetSample(sampleKey, selectedPadIndex);
    setIsLoadingSample(false);
    if (res.success) {
      setSampleFeedbackType('success');
      setSampleFeedbackMsg(`Loaded preset "${res.sampleName}" into Pad ${selectedPadIndex + 1} (${res.duration?.toFixed(2)}s)`);
      setBanks([...engine.padBanks]);
    } else {
      setSampleFeedbackType('error');
      setSampleFeedbackMsg(res.error || 'Failed to load preset sample.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoadingSample(true);
    setSampleFeedbackType('info');
    setSampleFeedbackMsg(`Decoding "${file.name}"...`);
    const res = await engine.loadSampleFromFile(file, selectedPadIndex);
    setIsLoadingSample(false);
    if (res.success) {
      setSampleFeedbackType('success');
      setSampleFeedbackMsg(`Loaded "${file.name}" into Pad ${selectedPadIndex + 1} (${res.duration?.toFixed(2)}s)`);
      setBanks([...engine.padBanks]);
    } else {
      setSampleFeedbackType('error');
      setSampleFeedbackMsg(res.error || 'Could not decode audio file.');
    }
  };

  const handleMicRecord = async () => {
    setIsMicRecording(true);
    setSampleFeedbackType('info');
    setSampleFeedbackMsg('Recording 2s microphone audio...');
    const res = await engine.recordMicSample(2.0, selectedPadIndex);
    setIsMicRecording(false);
    if (res.success) {
      setSampleFeedbackType('success');
      setSampleFeedbackMsg(`Mic sample recorded into Pad ${selectedPadIndex + 1}! (${res.duration?.toFixed(2)}s)`);
      setBanks([...engine.padBanks]);
    } else {
      setSampleFeedbackType('error');
      setSampleFeedbackMsg(res.error || 'Microphone access denied or recording error.');
    }
  };

  // --- 16-LEVELS CHROMATIC MELODIC SPREAD ---
  const handle16LevelsSpread = () => {
    engine.apply16Levels(selectedPadIndex);
    setBanks([...engine.padBanks]);
    setSampleFeedbackMsg(`Applied 16-Levels chromatic pitch spread from Pad ${selectedPadIndex + 1}!`);
  };

  // --- SOUND PACK EXPORT ---
  const handleExportPack = async () => {
    setIsExporting(true);
    await engine.exportSoundPack(exportFormat);
    setIsExporting(false);
    setIsExportModalOpen(false);
  };

  const updatePadSetting = <K extends keyof PadSampleSettings>(key: K, val: PadSampleSettings[K]) => {
    if (!currentBank || !currentBank.padConfigs[selectedPadIndex]) return;
    currentBank.padConfigs[selectedPadIndex].settings[key] = val;
    setBanks([...engine.padBanks]);
  };

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-300">
      {/* INFINITE PAD BANKS DRAWER & EXPORT BAR */}
      <div className="rounded-2xl bg-slate-950/85 border border-white/10 p-3.5 backdrop-blur-xl shadow-xl space-y-3">
        {/* Row 1: Bank Switcher & Kit Exporter */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-[70vw] no-scrollbar">
            {banks.map((b) => (
              <button
                key={b.id}
                onClick={() => handleBankSelect(b.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all border ${
                  activeBankId === b.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/25 border-cyan-400'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                }`}
              >
                {b.name}
              </button>
            ))}

            <button
              onClick={() => setIsNewBankModalOpen(true)}
              className="p-1.5 rounded-xl bg-white/5 border border-dashed border-white/20 text-slate-400 hover:text-cyan-300 hover:border-cyan-400 transition-all shrink-0"
              title="Create Custom Pad Bank"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-[11px] font-bold shadow-md shadow-purple-500/20 hover:brightness-110 active:scale-95 transition-all shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT PACK</span>
          </button>
        </div>

        {/* Row 2: Transport & Live Finger-Drumming Rec */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSequencer}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isPlaying
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-400/40'
                  : 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 active:scale-95'
              }`}
            >
              {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              onClick={async () => {
                await engine.initAudio();
                if (!isPlaying) {
                  engine.startSequencer();
                  setIsPlaying(true);
                }
                setIsRecording(!isRecording);
              }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/40 ring-2 ring-red-400 animate-pulse'
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:text-red-400'
              }`}
              title="Live Step Record"
            >
              <Circle className={`w-3.5 h-3.5 ${isRecording ? 'fill-current' : ''}`} />
            </button>

            <div className="text-[11px] text-slate-400 pl-1">
              <span className="font-semibold text-slate-100">{tempo} BPM</span> · Swing {swing}% · ±{humanize}ms
            </div>
          </div>

          {/* Quick Sample Ingestion / Chop Trigger */}
          <button
            onClick={() => setIsSampleModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold hover:bg-cyan-500/20 active:scale-95 transition-all"
          >
            <Music className="w-3.5 h-3.5" />
            <span>SAMPLE / CHOP</span>
          </button>
        </div>

        {/* Row 3: Haptics & Note Repeat */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Vibrate className="w-3.5 h-3.5 text-cyan-400" />
              <span>Haptics:</span>
            </span>
            {(['off', 'subtle', 'punch', 'heavy'] as HapticIntensity[]).map((level) => (
              <button
                key={level}
                onClick={() => {
                  setHapticSetting(level);
                  engine.hapticIntensity = level;
                  if (level !== 'off' && typeof window !== 'undefined' && 'vibrate' in navigator) {
                    navigator.vibrate(level === 'subtle' ? 10 : level === 'punch' ? 28 : [40, 15, 30]);
                  }
                }}
                className={`px-2 py-0.5 text-[10px] uppercase font-mono rounded-lg transition-colors ${
                  hapticSetting === level
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold'
                    : 'bg-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setRollMode(!rollMode)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1 transition-colors ${
                rollMode
                  ? 'bg-purple-500 text-slate-950 font-bold shadow-md shadow-purple-500/20'
                  : 'bg-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Repeat className="w-3 h-3" />
              <span>Roll: {rollMode ? 'ON' : 'OFF'}</span>
            </button>

            {rollMode && (
              <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg">
                {(['1/8', '1/16', '1/32', '1/16T'] as const).map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setRollSpeed(spd)}
                    className={`px-1.5 py-0.5 text-[9px] font-mono rounded ${
                      rollSpeed === spd ? 'bg-purple-400 text-slate-950 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {spd}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4x4 TACTILE 16-PAD GRID */}
      <div className="grid grid-cols-4 gap-2.5">
        {currentBank?.padConfigs.map((pad) => {
          const isTriggered = activePad === pad.id;
          const isSelected = selectedPadIndex === pad.id;
          const pitch = pad.settings?.pitchOffsetSemitones || 0;
          const isRev = pad.settings?.isReversed;

          const colorTheme =
            pad.category === 'sub'
              ? 'from-cyan-500/20 to-cyan-900/40 border-cyan-500/30 text-cyan-300'
              : pad.category === 'kick'
              ? 'from-blue-500/20 to-blue-900/40 border-blue-500/30 text-blue-300'
              : pad.category === 'snare'
              ? 'from-purple-500/20 to-purple-900/40 border-purple-500/30 text-purple-300'
              : pad.category === 'hihat'
              ? 'from-emerald-500/20 to-emerald-900/40 border-emerald-500/30 text-emerald-300'
              : pad.category === 'vocal'
              ? 'from-rose-500/20 to-rose-900/40 border-rose-500/30 text-rose-300'
              : 'from-amber-500/20 to-amber-900/40 border-amber-500/30 text-amber-300';

          return (
            <button
              key={pad.id}
              onPointerDown={(e) => handlePointerDown(pad.id, e)}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`relative h-20 rounded-2xl p-2 flex flex-col justify-between text-left transition-all duration-75 select-none touch-none bg-gradient-to-b border ${
                colorTheme
              } ${
                isTriggered
                  ? 'scale-95 brightness-150 ring-2 ring-white shadow-lg shadow-cyan-500/50'
                  : 'hover:brightness-110 active:scale-95'
              } ${isSelected ? 'ring-2 ring-cyan-400 shadow-md shadow-cyan-500/30' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-mono uppercase tracking-wider text-slate-400">
                  {pad.category}
                </span>
                <div className="flex items-center gap-1">
                  {pitch !== 0 && (
                    <span className="text-[8px] font-mono px-1 rounded bg-black/60 text-cyan-300 font-bold">
                      {pitch > 0 ? `+${pitch}` : pitch}st
                    </span>
                  )}
                  {isRev && (
                    <span className="text-[7px] font-mono px-1 rounded bg-purple-900/80 text-purple-200">
                      REV
                    </span>
                  )}
                  <span className="text-[8px] font-mono px-1 rounded bg-black/40 text-slate-400 font-bold">
                    {pad.id + 1}
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-bold text-slate-100 tracking-tight leading-tight truncate">
                {pad.name}
              </div>

              <div className="text-[8px] font-mono text-slate-400 truncate">
                {pad.sub}
              </div>
            </button>
          );
        })}
      </div>

      {/* SAMPLE CHOP & 16-LEVELS PITCH EDITOR DRAWER */}
      {currentPad && (
        <div className="rounded-2xl bg-slate-950/85 border border-white/10 p-3.5 backdrop-blur-xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100 uppercase">
                PAD {selectedPadIndex + 1}: <span className="text-cyan-400">{currentPad.name}</span>
              </span>
              <span className="text-[10px] text-slate-500">({currentPad.category})</span>
            </div>

            {/* 16-Levels Melodic Spread Button */}
            <button
              onClick={handle16LevelsSpread}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-bold hover:bg-purple-500/30 transition-all"
              title="Spread sample across 16 pads chromatically"
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>16-LEVELS MELODIC PITCH</span>
            </button>
          </div>

          {/* Sliders: Pitch (-24 to +24 semitones), Trim Start/End, Reverse */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-white/5 text-xs">
            {/* Pitch Semitones */}
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <div className="flex justify-between items-center mb-1 text-[10px] text-slate-400 font-mono">
                <span>PITCH OFFSET</span>
                <span className="text-cyan-400 font-bold">
                  {currentPad.settings.pitchOffsetSemitones > 0 ? `+` : ''}
                  {currentPad.settings.pitchOffsetSemitones} st
                </span>
              </div>
              <input
                type="range"
                min={-24}
                max={24}
                step={1}
                value={currentPad.settings.pitchOffsetSemitones}
                onChange={(e) => updatePadSetting('pitchOffsetSemitones', Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
            </div>

            {/* Start Trim % */}
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <div className="flex justify-between items-center mb-1 text-[10px] text-slate-400 font-mono">
                <span>START TRIM</span>
                <span className="text-emerald-400 font-bold">{currentPad.settings.startTrimPercent}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={85}
                value={currentPad.settings.startTrimPercent}
                onChange={(e) => updatePadSetting('startTrimPercent', Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
            </div>

            {/* End Trim % */}
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <div className="flex justify-between items-center mb-1 text-[10px] text-slate-400 font-mono">
                <span>END TRIM</span>
                <span className="text-amber-400 font-bold">{currentPad.settings.endTrimPercent}%</span>
              </div>
              <input
                type="range"
                min={15}
                max={100}
                value={currentPad.settings.endTrimPercent}
                onChange={(e) => updatePadSetting('endTrimPercent', Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
            </div>

            {/* Reverse & One-Shot Toggles */}
            <div className="bg-white/5 rounded-xl p-2 border border-white/5 flex items-center justify-around">
              <button
                onClick={() => updatePadSetting('isReversed', !currentPad.settings.isReversed)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all border ${
                  currentPad.settings.isReversed
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                    : 'bg-slate-900 border-white/10 text-slate-400'
                }`}
              >
                REV: {currentPad.settings.isReversed ? 'ON' : 'OFF'}
              </button>

              <button
                onClick={() => updatePadSetting('oneShot', !currentPad.settings.oneShot)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all border ${
                  currentPad.settings.oneShot
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-900 border-white/10 text-slate-400'
                }`}
              >
                ONE-SHOT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 16-STEP SEQUENCER ROW */}
      <div className="rounded-2xl bg-slate-950/85 border border-white/10 p-3.5 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-200">
              Editing Track:{' '}
              <span className="text-cyan-400">
                {currentBank?.padConfigs[selectedPadIndex]?.name || `Pad ${selectedPadIndex + 1}`}
              </span>
            </span>
            <span className="text-[10px] text-slate-500">(tap pad to switch track)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400">
              Step {currentStep + 1} / 16
            </span>
            <button
              onClick={handleClearPattern}
              className="p-1.5 text-slate-400 hover:text-slate-200 bg-white/5 rounded-lg border border-white/5"
              title="Clear All Tracks"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 16 Step Buttons */}
        <div className="grid grid-cols-16 gap-1">
          {Array.from({ length: 16 }).map((_, stepIdx) => {
            const isStepActive = pattern[selectedPadIndex]?.[stepIdx];
            const isCurrentPlayingStep = isPlaying && currentStep === stepIdx;
            const isBeatDivision = stepIdx % 4 === 0;

            return (
              <button
                key={stepIdx}
                onClick={() => handleToggleStep(stepIdx)}
                className={`h-11 rounded-lg flex flex-col items-center justify-between py-1 transition-all ${
                  isStepActive
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/40'
                    : isBeatDivision
                    ? 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-400'
                    : 'bg-slate-900/60 hover:bg-slate-800/60 text-slate-500'
                } ${
                  isCurrentPlayingStep
                    ? 'ring-2 ring-emerald-400 scale-105 brightness-150 z-10'
                    : ''
                }`}
              >
                <span className="text-[8px] font-mono">{stepIdx + 1}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isStepActive ? 'bg-slate-950' : 'bg-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* SAMPLE INGESTION MODAL */}
      {isSampleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Music className="w-4 h-4 text-cyan-400" />
                <span>Load Sample into Pad {selectedPadIndex + 1} ({currentPad.name})</span>
              </h3>
              <button
                onClick={() => {
                  setIsSampleModalOpen(false);
                  setSampleFeedbackMsg(null);
                }}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Built-in Studio Presets Palette */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Instant Studio Presets (Zero Latency):</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">16 Studio Sounds</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-950/60 rounded-xl border border-white/5">
                {STUDIO_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => handleLoadPreset(preset.key)}
                    disabled={isLoadingSample}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-500/40 border border-white/5 text-left transition-all group flex flex-col justify-between cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-slate-200 group-hover:text-cyan-300 truncate w-full">
                      {preset.name}
                    </span>
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider font-mono">
                      {preset.tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* URL Fetch Form */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-cyan-400" />
                <span>Link — YouTube, Spotify, Apple Music, Deezer, SoundCloud, or a direct file:</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="YouTube, Spotify, Apple Music, or https://.../sample.mp3"
                  value={sampleUrlInput}
                  onChange={(e) => setSampleUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLoadFromUrl();
                  }}
                  className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  onClick={() => handleLoadFromUrl()}
                  disabled={isLoadingSample || !sampleUrlInput.trim()}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isLoadingSample ? 'Loading...' : 'Fetch'}
                </button>
              </div>

              {/* Demo quick links */}
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                <span className="text-[9px] text-slate-500 uppercase font-mono">Demo URLs:</span>
                {DEMO_AUDIO_URLS.map((demo) => (
                  <button
                    key={demo.name}
                    onClick={() => {
                      setSampleUrlInput(demo.url);
                      handleLoadFromUrl(demo.url);
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-cyan-300/80 hover:text-cyan-200 border border-white/5 transition-all cursor-pointer whitespace-nowrap"
                  >
                    {demo.name}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                YouTube, Spotify, Apple Music, Deezer, and SoundCloud links resolve to an official preview URL. Direct .mp3 / .wav / .ogg files load in full. Streaming pages are not ripped.
              </p>
            </div>

            {/* Mic Record & File Upload Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
              <button
                onClick={handleMicRecord}
                disabled={isMicRecording}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  isMicRecording
                    ? 'bg-red-500/20 border-red-500 text-red-300 animate-pulse'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200'
                }`}
              >
                <Mic className="w-5 h-5 text-red-400" />
                <span className="text-[11px] font-bold">
                  {isMicRecording ? 'Recording (2s)...' : 'Record Mic'}
                </span>
                <span className="text-[9px] text-slate-400">Direct vocal/beatbox</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <Upload className="w-5 h-5 text-cyan-400" />
                <span className="text-[11px] font-bold">Upload File</span>
                <span className="text-[9px] text-slate-400">WAV, MP3, OGG</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </button>
            </div>

            {/* Feedback Message */}
            {sampleFeedbackMsg && (
              <div
                className={`p-2.5 rounded-xl border text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all transition-all ${
                  sampleFeedbackType === 'success'
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                    : sampleFeedbackType === 'error'
                    ? 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                    : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300'
                }`}
              >
                {sampleFeedbackMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXPORT SOUND PACK MODAL */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Download className="w-4 h-4 text-purple-400" />
                <span>Export Sound Pack for Desktop/Mobile DAWs</span>
              </h3>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Export all 16 pads in the active bank ({currentBank?.name}) with tuning, reverse flags, and kit mapping directly into your DAW format:
            </p>

            <div className="space-y-2">
              {[
                { id: 'fl_studio', name: 'FL Studio FPC Kit', desc: 'Pre-mapped pads with pitch & panning for Image-Line FPC' },
                { id: 'bandlab', name: 'BandLab Mobile Sampler', desc: 'Formatted for BandLab Creator Studio sampler packs' },
                { id: 'garageband', name: 'GarageBand / Logic DMD', desc: 'Apple Drum Machine Designer GM pad mapping' }
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setExportFormat(fmt.id as any)}
                  className={`w-full p-3 rounded-xl text-left border transition-all ${
                    exportFormat === fmt.id
                      ? 'bg-purple-500/20 border-purple-500 text-purple-200 font-semibold'
                      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="text-xs font-bold">{fmt.name}</div>
                  <div className="text-[10px] text-slate-400">{fmt.desc}</div>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleExportPack}
                disabled={isExporting}
                className="px-4 py-2 rounded-xl bg-purple-500 text-white font-bold text-xs hover:bg-purple-400 shadow-md shadow-purple-500/20"
              >
                {isExporting ? 'Generating Pack...' : 'Download Kit Bundle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW CUSTOM BANK MODAL */}
      {isNewBankModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Create New Pad Bank</span>
            </h3>

            <input
              type="text"
              placeholder="e.g. My Drill 808 Kit"
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsNewBankModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBank}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400"
              >
                Create Bank
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
