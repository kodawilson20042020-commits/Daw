/**
 * AURA DSP - REFERENCE LAB VIEW
 * Professional Monitoring, Translation, Reference & Analysis Environment
 *
 * Design Constitution:
 * - Anti-AI slop: Clean, high-density professional audio console styling
 * - Signal flow: SOURCE -> MIX -> MONITORING SYSTEM -> ACOUSTIC ENVIRONMENT -> LISTENER
 * - Three View Tiers: SIMPLE | ENGINEER | ADVANCED
 * - Real-time canvas telemetry (FFT Spectrum with octave smoothing, Vectorscope/Goniometer, Loudness History)
 * - Level-Matched A/B Comparison and Blind X/Y testing mode
 * - Pre vs Post monitoring analysis tap: "What is in my mix?" vs "What is my monitoring system doing?"
 */

import React, { useState, useEffect, useRef } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import {
  MonitoringProfile,
  PrePostTap,
  AuditionMode,
  MobileViewTier,
  DynamicsTelemetry,
  Snapshot
} from '../types/audio';
import { FACTORY_PROFILES, ProfileDatabase } from '../audio/referenceProfiles';
import {
  Sliders,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Radio,
  Headphones,
  Smartphone,
  Car,
  Tv,
  Music,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Zap,
  Activity,
  Layers,
  HelpCircle,
  Upload,
  Play,
  Square,
  Shield,
  Clock,
  Compass,
  Gauge
} from 'lucide-react';

interface ReferenceLabViewProps {
  onOpenTranslator?: () => void;
  onOpenQuickExport?: () => void;
}

export const ReferenceLabView: React.FC<ReferenceLabViewProps> = () => {
  const engine = AudioEngine.getInstance();
  const lab = engine.referenceLab;

  const [profiles, setProfiles] = useState<MonitoringProfile[]>(FACTORY_PROFILES);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    lab?.activeProfile.id || FACTORY_PROFILES[0].id
  );
  const [viewTier, setViewTier] = useState<MobileViewTier>('engineer');
  const [prePostTap, setPrePostTap] = useState<PrePostTap>(lab?.prePostTap || 'post');
  const [auditionMode, setAuditionMode] = useState<AuditionMode>(lab?.auditionMode || 'stereo');

  // Telemetry state
  const [telemetry, setTelemetry] = useState<DynamicsTelemetry>(
    lab?.telemetry || {
      peakL: 0,
      peakR: 0,
      rmsL: 0,
      rmsR: 0,
      lufsMomentary: -70,
      lufsShortTerm: -70,
      lufsIntegrated: -70,
      crestFactor: 0,
      dynamicRangeScore: 12,
      truePeakDb: -70,
      correlation: 1.0,
      stereoWidth: 100,
      balanceLr: 0,
      midEnergy: 0,
      sideEnergy: 0,
      spectralDensity: 0,
      spectralTiltDb: -3.0,
      loudnessHistory: new Array(60).fill(-70),
      dynamicHistory: new Array(60).fill(12),
      clipCount: 0
    }
  );

  // Safety & reference state
  const [isDim, setIsDim] = useState(lab?.safetyState.isDimActive || false);
  const [isMute, setIsMute] = useState(lab?.safetyState.isMuteActive || false);
  const [currentSource, setCurrentSource] = useState<'A' | 'B'>(
    lab?.referenceTrackState.currentSource || 'A'
  );
  const [isLevelMatch, setIsLevelMatch] = useState(
    lab?.referenceTrackState.isLevelMatchActive ?? true
  );
  const [isBlindMode, setIsBlindMode] = useState(
    lab?.referenceTrackState.isBlindMode || false
  );
  const [blindRevealed, setBlindRevealed] = useState(
    lab?.referenceTrackState.blindRevealed || false
  );

  // Spectral memory
  const [isFrozen, setIsFrozen] = useState(lab?.spectralMemory.isFrozen || false);
  const [spectralDeltas, setSpectralDeltas] = useState({
    low: 0,
    mid: 0,
    high: 0
  });

  // Calibration Wizard modal state
  const [isCalibModalOpen, setIsCalibModalOpen] = useState(false);
  const [calibSpl, setCalibSpl] = useState<73 | 79 | 83 | 85>(83);
  const [userSplInput, setUserSplInput] = useState('83.0');

  // Canvas references
  const spectrumCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const vectorscopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load profiles on mount
  useEffect(() => {
    setProfiles(ProfileDatabase.getAllProfiles());
    if (lab) {
      setSelectedProfileId(lab.activeProfile.id);
    }
  }, [lab]);

  // Telemetry animation loop
  useEffect(() => {
    let animId: number;
    const renderLoop = () => {
      if (lab) {
        const telem = lab.updateTelemetry();
        setTelemetry({ ...telem });

        // Update state mirrors
        setIsDim(lab.safetyState.isDimActive);
        setIsMute(lab.safetyState.isMuteActive);
        setCurrentSource(lab.referenceTrackState.currentSource);
        setIsBlindMode(lab.referenceTrackState.isBlindMode);
        setBlindRevealed(lab.referenceTrackState.blindRevealed);
        setIsFrozen(lab.spectralMemory.isFrozen);
        setSpectralDeltas({
          low: lab.spectralMemory.deltaLowDb,
          mid: lab.spectralMemory.deltaMidDb,
          high: lab.spectralMemory.deltaHighDb
        });

        // 1. Draw Spectrum Analyzer
        drawSpectrum();
        // 2. Draw Vectorscope / Goniometer
        drawVectorscope();
        // 3. Draw Loudness History
        drawLoudnessHistory();
      }
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [lab, prePostTap]);

  // Spectrum rendering
  const drawSpectrum = () => {
    const canvas = spectrumCanvasRef.current;
    if (!canvas || !lab) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const data = lab.getPrePostSpectrum();
    const freqData = prePostTap === 'pre' ? data.pre : data.post;
    const bins = freqData.length;

    ctx.clearRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridDbs = [-12, -24, -36, -48, -60];
    gridDbs.forEach((db) => {
      const y = ((db + 70) / 70) * height;
      ctx.beginPath();
      ctx.moveTo(0, height - y);
      ctx.lineTo(width, height - y);
      ctx.stroke();
    });

    // Frequency markers (20, 100, 1k, 10k Hz)
    const markerFreqs = [20, 100, 1000, 10000];
    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.font = '9px monospace';
    markerFreqs.forEach((f) => {
      const x = (Math.log10(f / 20) / Math.log10(20000 / 20)) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.fillText(f >= 1000 ? `${f / 1000}k` : `${f}`, x + 2, height - 4);
    });

    // Draw Frozen Spectrum curve if active
    if (lab.spectralMemory.frozenMixSpectrum) {
      const frozen = lab.spectralMemory.frozenMixSpectrum;
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < bins; i++) {
        const freq = (i / bins) * (lab['ctx'].sampleRate / 2);
        if (freq < 20 || freq > 20000) continue;
        const x = (Math.log10(freq / 20) / Math.log10(20000 / 20)) * width;
        const val = Math.max(-80, Math.min(0, frozen[i]));
        const y = height - ((val + 80) / 80) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Draw Real-time Spectrum curve
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (prePostTap === 'pre') {
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.5)'); // Cyan for Mix Pre
      gradient.addColorStop(1, 'rgba(6, 182, 212, 0.02)');
      ctx.strokeStyle = '#06b6d4';
    } else {
      gradient.addColorStop(0, 'rgba(168, 85, 247, 0.5)'); // Purple for Post Monitoring
      gradient.addColorStop(1, 'rgba(168, 85, 247, 0.02)');
      ctx.strokeStyle = '#a855f7';
    }

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height);

    for (let i = 0; i < bins; i++) {
      const freq = (i / bins) * (lab['ctx'].sampleRate / 2);
      if (freq < 20 || freq > 20000) continue;
      const x = (Math.log10(freq / 20) / Math.log10(20000 / 20)) * width;
      const val = Math.max(-80, Math.min(0, freqData[i]));
      const y = height - ((val + 80) / 80) * height;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.stroke();
  };

  // Vectorscope / Goniometer rendering
  const drawVectorscope = () => {
    const canvas = vectorscopeCanvasRef.current;
    if (!canvas || !lab) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const data = lab.getPrePostSpectrum().timeDomain;

    // Fading persistence
    ctx.fillStyle = 'rgba(7, 9, 14, 0.25)';
    ctx.fillRect(0, 0, width, height);

    // Crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // 45-degree M/S axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, height);
    ctx.moveTo(width, 0);
    ctx.lineTo(0, height);
    ctx.stroke();

    // Plot stereo lissajous points (L-R on X, L+R on Y)
    ctx.strokeStyle = prePostTap === 'pre' ? 'rgba(6, 182, 212, 0.6)' : 'rgba(168, 85, 247, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const len = data.length;
    for (let i = 0; i < len; i += 4) {
      const l = data[i];
      const r = data[i + 1] || l;
      // Rotate 45 deg for goniometer (X = Side, Y = Mid)
      const x = centerX + (l - r) * centerX * 0.9;
      const y = centerY - (l + r) * centerY * 0.9;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  // Loudness History Graph
  const drawLoudnessHistory = () => {
    const canvas = historyCanvasRef.current;
    if (!canvas || !lab) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const history = telemetry.loudnessHistory;

    ctx.clearRect(0, 0, width, height);

    // Target threshold guide (-14 LUFS standard)
    const targetY = height - ((-14 + 70) / 70) * height;
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(width, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Plot LUFS curve
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < history.length; i++) {
      const x = (i / (history.length - 1)) * width;
      const lufs = Math.max(-70, Math.min(0, history[i]));
      const y = height - ((lufs + 70) / 70) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  const handleSelectProfile = (profileId: string) => {
    const prof = profiles.find((p) => p.id === profileId);
    if (prof && lab) {
      setSelectedProfileId(profileId);
      lab.setProfile(prof);
    }
  };

  const handleTogglePrePostTap = () => {
    if (!lab) return;
    const next = prePostTap === 'pre' ? 'post' : 'pre';
    setPrePostTap(next);
    lab.prePostTap = next;
  };

  const handleSetAuditionMode = (mode: AuditionMode) => {
    if (!lab) return;
    setAuditionMode(mode);
    lab.auditionMode = mode;
    lab.updateAuditionRouting();
  };

  const handleUserFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && lab) {
      await lab.loadUserReferenceFile(file);
    }
  };

  const handleSaveCalibration = () => {
    if (!lab) return;
    const measured = parseFloat(userSplInput) || 83.0;
    const offset = Math.round((calibSpl - measured) * 10) / 10;
    lab.setCalibrationSpl(calibSpl);
    lab.applyCalibrationOffset(offset);
    setIsCalibModalOpen(false);
  };

  // Helper icons per profile category
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'headphones':
        return <Headphones className="w-4 h-4 text-cyan-400" />;
      case 'mobile':
        return <Smartphone className="w-4 h-4 text-amber-400" />;
      case 'automotive':
        return <Car className="w-4 h-4 text-rose-400" />;
      case 'home':
        return <Tv className="w-4 h-4 text-purple-400" />;
      default:
        return <Radio className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-4 pb-28 animate-in fade-in duration-300">
      {/* 1. TOP MONITORING CONTROL BAR & REST REMINDER */}
      <div className="rounded-3xl bg-slate-950/85 border border-white/10 p-3.5 backdrop-blur-xl shadow-2xl space-y-3">
        {/* Row 1: Wordmark & View Tier Switcher */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/10">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black tracking-tight text-white uppercase">
                  Reference Lab
                </h2>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-800/40">
                  CALIBRATED TRANSLATION
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Acoustic Profile Modeling • Level-Matched Reference • 60fps Phase Engine
              </p>
            </div>
          </div>

          {/* View Tier Switcher: SIMPLE | ENGINEER | ADVANCED */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
            {(['simple', 'engineer', 'advanced'] as MobileViewTier[]).map((tier) => (
              <button
                key={tier}
                onClick={() => setViewTier(tier)}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-lg transition-colors ${
                  viewTier === tier
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Crucial Signal Flow Tap ("PRE: In Mix" vs "POST: Through Monitoring") & Safety Controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider">TAP:</span>
            <button
              onClick={handleTogglePrePostTap}
              className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-wider flex items-center gap-1.5 transition-all shadow-md ${
                prePostTap === 'pre'
                  ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400/40'
                  : 'bg-purple-600 text-white ring-2 ring-purple-500/40'
              }`}
            >
              {prePostTap === 'pre' ? (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  PRE (IN THE MIX)
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5" />
                  POST (MONITORING SYSTEM)
                </>
              )}
            </button>
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              {prePostTap === 'pre' ? 'Inspecting raw mix energy' : 'Inspecting acoustic environment translation'}
            </span>
          </div>

          {/* Safety Buttons: DIM (-20dB), MUTE, Emergency Stop */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => lab?.toggleDim()}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                isDim
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
              }`}
            >
              -20dB DIM
            </button>
            <button
              onClick={() => lab?.toggleMute()}
              className={`p-2 rounded-xl text-xs font-bold transition-all ${
                isMute
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                  : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
              }`}
              title="Mute Audio"
            >
              {isMute ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsCalibModalOpen(true)}
              className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lab?.safetyState.calibrationSpl} dB SPL</span>
            </button>
          </div>
        </div>

        {/* Ear Fatigue Reminder Banner */}
        {lab?.safetyState.isRestBreakReminderDue && (
          <div className="rounded-2xl bg-amber-950/80 border border-amber-500/40 p-2.5 flex items-center justify-between text-amber-200 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
              <span>Listening time reached 45 min. Take a 5-min silence break to protect ear calibration.</span>
            </div>
            <button
              onClick={() => lab.dismissRestReminder()}
              className="px-2 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-[10px]"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* 2. ACOUSTIC PROFILES CAROUSEL */}
      <div className="rounded-3xl bg-slate-950/80 border border-white/10 p-3.5 backdrop-blur-xl shadow-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Monitoring Environment Profiles ({profiles.length})
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {lab?.activeProfile.hardwareSimModel}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {profiles.map((p) => {
            const isSelected = p.id === selectedProfileId;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectProfile(p.id)}
                className={`flex-shrink-0 min-w-[150px] p-2.5 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-400/50 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/30'
                    : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  {getCategoryIcon(p.category)}
                  <span className="text-[9px] font-mono px-1 rounded bg-black/40 text-slate-300">
                    {p.category.toUpperCase()}
                  </span>
                </div>
                <div className={`text-xs font-bold truncate ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                  {p.name}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  Bass: {p.bassRolloffFreq}Hz • Width: {Math.round(p.stereoWidthFactor * 100)}%
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. LEVEL-MATCHED REFERENCE TRACK & BLIND A/B CONSOLE */}
      <div className="rounded-3xl bg-slate-950/85 border border-white/10 p-3.5 backdrop-blur-xl shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Music className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>Reference Track A/B</span>
                {lab?.referenceTrackState.isLevelMatchActive && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                    LUFS MATCHED ({lab?.referenceTrackState.levelMatchOffsetDb > 0 ? '+' : ''}
                    {lab?.referenceTrackState.levelMatchOffsetDb} dB)
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[240px]">
                {lab?.referenceTrackState.title}
              </div>
            </div>
          </div>

          {/* Level Match Toggle & User Upload CTA */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => lab?.setLevelMatch(!isLevelMatch)}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-colors ${
                isLevelMatch
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-white/5 text-slate-500 border border-white/5'
              }`}
            >
              Level Match: {isLevelMatch ? 'ON' : 'OFF'}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUserFileUpload}
              accept=".wav,.mp3,.ogg,.flac"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
              title="Load custom reference WAV/MP3"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Source Switcher: SOURCE A (Mix) vs SOURCE B (Reference) & BLIND TEST */}
        {!isBlindMode ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => lab?.switchToSourceA()}
              className={`py-3 px-4 rounded-2xl font-black text-xs tracking-wider transition-all flex items-center justify-between ${
                currentSource === 'A'
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400'
                  : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
              }`}
            >
              <span>SOURCE A: YOUR MIX</span>
              <span className="text-[10px] font-mono">{telemetry.lufsIntegrated.toFixed(1)} LUFS</span>
            </button>

            <button
              onClick={() => lab?.switchToSourceB()}
              className={`py-3 px-4 rounded-2xl font-black text-xs tracking-wider transition-all flex items-center justify-between ${
                currentSource === 'B'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20 ring-2 ring-purple-400'
                  : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
              }`}
            >
              <span>SOURCE B: REFERENCE</span>
              <span className="text-[10px] font-mono">
                {lab?.referenceTrackState.trackLufs.toFixed(1)} LUFS
              </span>
            </button>
          </div>
        ) : (
          /* Blind Mode Interface */
          <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                <EyeOff className="w-4 h-4 text-purple-400" />
                Blind Listening Test (Identity Hidden)
              </span>
              <button
                onClick={() => lab?.exitBlindMode()}
                className="text-[10px] font-bold text-purple-400 hover:text-purple-300"
              >
                Exit Blind Mode
              </button>
            </div>
            {!blindRevealed ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => lab?.recordBlindChoice('A')}
                  className="py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                >
                  Vote Choice: Option A
                </button>
                <button
                  onClick={() => lab?.recordBlindChoice('B')}
                  className="py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                >
                  Vote Choice: Option B
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-purple-900/50 border border-purple-400/40 text-center space-y-1">
                <div className="text-xs font-bold text-white">
                  You chose {lab?.referenceTrackState.blindChoice} • It was actually{' '}
                  <span className="text-cyan-300 font-black">
                    {lab?.referenceTrackState.currentSource === 'A' ? 'Your Mix' : 'The Reference Track'}
                  </span>
                </div>
                <button
                  onClick={() => lab?.startBlindTest()}
                  className="text-[10px] font-bold text-purple-300 underline"
                >
                  Start Next Round
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] pt-1">
          <button
            onClick={() => lab?.startBlindTest()}
            className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 text-[11px]"
          >
            <EyeOff className="w-3.5 h-3.5" />
            Launch Blind AB Test
          </button>
          <button
            onClick={() => lab?.calculateLevelMatch()}
            className="text-cyan-400 hover:text-cyan-300 font-bold text-[11px]"
          >
            Re-Calculate LUFS Match
          </button>
        </div>
      </div>

      {/* 4. HIGH-RESOLUTION DUAL CANVASES: FFT SPECTRUM & VECTORSCOPE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Spectrum Canvas (2 cols) */}
        <div className="md:col-span-2 rounded-3xl bg-slate-950/85 border border-white/10 p-3.5 backdrop-blur-xl shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              FFT Spectrum ({prePostTap === 'pre' ? 'Mix Pre-Tap' : 'Monitored Post-Tap'})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (isFrozen) lab?.unfreezeSpectrum();
                  else lab?.freezeCurrentMixSpectrum();
                }}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-colors ${
                  isFrozen
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {isFrozen ? 'FROZEN (UNFREEZE)' : 'FREEZE MIX'}
              </button>
            </div>
          </div>

          <div className="relative w-full h-44 bg-black/60 rounded-2xl overflow-hidden border border-white/5">
            <canvas ref={spectrumCanvasRef} width={640} height={176} className="w-full h-full" />
            {isFrozen && (
              <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/70 border border-amber-500/40 text-[9px] font-mono text-amber-300">
                Δ Low: {spectralDeltas.low > 0 ? '+' : ''}{spectralDeltas.low}dB • Δ Mid: {spectralDeltas.mid > 0 ? '+' : ''}{spectralDeltas.mid}dB • Δ High: {spectralDeltas.high > 0 ? '+' : ''}{spectralDeltas.high}dB
              </div>
            )}
          </div>
        </div>

        {/* Goniometer / Vectorscope Canvas (1 col) */}
        <div className="rounded-3xl bg-slate-950/85 border border-white/10 p-3.5 backdrop-blur-xl shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-purple-400" />
              Phase Goniometer
            </span>
            <span className="text-[10px] font-mono text-cyan-300">
              r = {telemetry.correlation >= 0 ? '+' : ''}{telemetry.correlation.toFixed(2)}
            </span>
          </div>

          <div className="relative w-full h-44 bg-black/60 rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center">
            <canvas ref={vectorscopeCanvasRef} width={200} height={176} className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* 5. AUDITION MODES: MONO, SIDE-ONLY, MID-ONLY, LEFT, RIGHT */}
      <div className="rounded-3xl bg-slate-950/80 border border-white/10 p-3.5 backdrop-blur-xl shadow-xl space-y-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Audition Isolation Matrix
        </span>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {(
            [
              { id: 'stereo', label: 'Stereo' },
              { id: 'mono', label: 'Mono Check' },
              { id: 'mid_only', label: 'Mid Only' },
              { id: 'side_only', label: 'Side Only' },
              { id: 'left_only', label: 'Left (L)' },
              { id: 'right_only', label: 'Right (R)' }
            ] as { id: AuditionMode; label: string }[]
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => handleSetAuditionMode(m.id)}
              className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                auditionMode === m.id
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                  : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 6. DYNAMICS & LOUDNESS TELEMETRY TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-2xl bg-slate-950/70 border border-white/10 p-3 backdrop-blur-md">
          <div className="text-[10px] text-slate-400 font-semibold uppercase">LUFS Integrated</div>
          <div className="text-xl font-black text-cyan-300 font-mono mt-0.5">
            {telemetry.lufsIntegrated.toFixed(1)}
          </div>
          <div className="text-[9px] text-slate-500 mt-1">Short-Term: {telemetry.lufsShortTerm.toFixed(1)}</div>
        </div>

        <div className="rounded-2xl bg-slate-950/70 border border-white/10 p-3 backdrop-blur-md">
          <div className="text-[10px] text-slate-400 font-semibold uppercase">True Peak</div>
          <div className={`text-xl font-black font-mono mt-0.5 ${telemetry.truePeakDb > 0 ? 'text-rose-400' : 'text-slate-100'}`}>
            {telemetry.truePeakDb > 0 ? '+' : ''}{telemetry.truePeakDb.toFixed(1)} dBTP
          </div>
          <div className="text-[9px] text-slate-500 mt-1">Ceiling: {lab?.safetyState.ceilingDb} dBFS</div>
        </div>

        <div className="rounded-2xl bg-slate-950/70 border border-white/10 p-3 backdrop-blur-md">
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Dynamic Range (DR)</div>
          <div className="text-xl font-black text-amber-300 font-mono mt-0.5">
            DR{telemetry.dynamicRangeScore}
          </div>
          <div className="text-[9px] text-slate-500 mt-1">Crest: {telemetry.crestFactor.toFixed(1)} dB</div>
        </div>

        <div className="rounded-2xl bg-slate-950/70 border border-white/10 p-3 backdrop-blur-md">
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Stereo Width</div>
          <div className="text-xl font-black text-purple-300 font-mono mt-0.5">
            {telemetry.stereoWidth}%
          </div>
          <div className="text-[9px] text-slate-500 mt-1">Phase: {telemetry.correlation.toFixed(2)} r</div>
        </div>
      </div>

      {/* 7. LOUDNESS ROLLING HISTORY (ADVANCED TIER) */}
      {viewTier !== 'simple' && (
        <div className="rounded-3xl bg-slate-950/80 border border-white/10 p-3.5 backdrop-blur-xl shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              Continuous Loudness Profile (Target: -14.0 LUFS)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              M: {telemetry.lufsMomentary.toFixed(1)} LUFS
            </span>
          </div>
          <div className="w-full h-20 bg-black/60 rounded-2xl overflow-hidden border border-white/5">
            <canvas ref={historyCanvasRef} width={640} height={80} className="w-full h-full" />
          </div>
        </div>
      )}

      {/* 8. SNAPSHOT A/B RECALL */}
      <div className="rounded-2xl bg-slate-950/60 border border-white/5 p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase">Snapshots:</span>
          <button
            onClick={() => lab?.captureSnapshot('A')}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
          >
            Save A
          </button>
          <button
            onClick={() => lab?.recallSnapshot('A')}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
          >
            Recall A
          </button>
          <button
            onClick={() => lab?.captureSnapshot('B')}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
          >
            Save B
          </button>
          <button
            onClick={() => lab?.recallSnapshot('B')}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30"
          >
            Recall B
          </button>
        </div>

        <button
          onClick={() => lab?.toggleGranularBypass('totalBypass')}
          className={`px-3 py-1 text-xs font-bold rounded-xl transition-colors ${
            lab?.granularBypasses.totalBypass
              ? 'bg-rose-500 text-white'
              : 'bg-white/5 text-slate-400 hover:text-white'
          }`}
        >
          {lab?.granularBypasses.totalBypass ? 'MONITORING BYPASS ACTIVE' : 'BYPASS ALL'}
        </button>
      </div>

      {/* 9. CALIBRATION WIZARD MODAL */}
      {isCalibModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0b0f19] border border-cyan-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                SPL Calibration Wizard
              </h3>
              <button
                onClick={() => setIsCalibModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Align listening environment with standard cinema & studio reference levels (C-Weighted Slow):
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300">Target Reference SPL</label>
                <div className="grid grid-cols-4 gap-1.5 mt-1">
                  {[73, 79, 83, 85].map((spl) => (
                    <button
                      key={spl}
                      onClick={() => setCalibSpl(spl as 73 | 79 | 83 | 85)}
                      className={`py-2 rounded-xl text-xs font-bold border ${
                        calibSpl === spl
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-white/5 text-slate-400 border-white/5'
                      }`}
                    >
                      {spl} dB
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300">
                  Measured SPL from Sound Level Meter / Phone Mic (dB)
                </label>
                <input
                  type="number"
                  value={userSplInput}
                  onChange={(e) => setUserSplInput(e.target.value)}
                  className="w-full mt-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsCalibModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCalibration}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
              >
                Apply & Lock Calibration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
