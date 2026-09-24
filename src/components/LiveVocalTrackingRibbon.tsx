/**
 * AURA DSP - Live Vocal Tracking & Direct Monitoring Ribbon
 * Professional studio microphone input bus with zero-latency hardware monitoring,
 * progressive fallback, virtual studio vocal feed, live input VU meter, and multi-take recording.
 */

import React, { useState, useEffect } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import { LiveTrackingState, RecordedTake } from '../audio/LiveTrackingController';
import {
  Mic,
  MicOff,
  Headphones,
  Circle,
  Square,
  Play,
  Trash2,
  Download,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { downloadBlob } from '../audio/wavEncoder';

export const LiveVocalTrackingRibbon: React.FC = () => {
  const engine = AudioEngine.getInstance();
  const [trackingState, setTrackingState] = useState<LiveTrackingState>({
    isTrackingActive: false,
    isDirectMonitoring: false,
    isRecordingTake: false,
    isVirtualFeed: false,
    inputLevel: 0,
    takes: []
  });
  const [micGain, setMicGain] = useState<number>(1.0);
  const [recDuration, setRecDuration] = useState<number>(0);
  const [takesDrawerOpen, setTakesDrawerOpen] = useState<boolean>(false);
  const [auditioningTakeId, setAuditioningTakeId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subscribe to tracking controller state
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const attach = () => {
      if (engine.liveTracking) {
        unsubscribe = engine.liveTracking.subscribe((st) => {
          setTrackingState({ ...st });
        });
      }
    };

    attach();
    const pollInterval = setInterval(() => {
      if (!unsubscribe && engine.liveTracking) {
        attach();
      }
    }, 200);

    return () => {
      clearInterval(pollInterval);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Recording duration timer
  useEffect(() => {
    let timer: number;
    if (trackingState.isRecordingTake) {
      setRecDuration(0);
      timer = window.setInterval(() => {
        setRecDuration((d) => d + 0.1);
      }, 100);
    }
    return () => clearInterval(timer);
  }, [trackingState.isRecordingTake]);

  const handleToggleMicrophone = async () => {
    setErrorMessage(null);
    await engine.initAudio();

    if (!engine.liveTracking) return;

    if (trackingState.isTrackingActive) {
      engine.liveTracking.deactivateMicrophone();
    } else {
      const res = await engine.liveTracking.activateStudioMicrophone();
      if (!res.success) {
        setErrorMessage(res.error || 'Microphone access denied by browser or platform.');
      }
    }
  };

  const handleActivateVirtualFeed = async () => {
    setErrorMessage(null);
    await engine.initAudio();
    if (engine.liveTracking) {
      engine.liveTracking.activateVirtualStudioVocalFeed();
    }
  };

  const handleToggleMonitoring = () => {
    if (engine.liveTracking) {
      engine.liveTracking.toggleDirectMonitoring();
    }
  };

  const handleGainChange = (val: number) => {
    setMicGain(val);
    if (engine.liveTracking) {
      engine.liveTracking.setMicGain(val);
    }
  };

  const handleToggleTakeRecording = () => {
    if (!engine.liveTracking) return;

    if (trackingState.isRecordingTake) {
      engine.liveTracking.stopTakeRecording();
    } else {
      engine.liveTracking.startTakeRecording();
    }
  };

  const handleAuditionTake = (take: RecordedTake) => {
    if (!engine.ctx || !engine.workletNode) return;

    if (auditioningTakeId === take.id) {
      setAuditioningTakeId(null);
      return;
    }

    const src = engine.ctx.createBufferSource();
    src.buffer = take.buffer;
    src.connect(engine.workletNode);
    src.onended = () => setAuditioningTakeId(null);
    src.start();
    setAuditioningTakeId(take.id);
  };

  const inputLevelDb = Math.max(-60, Math.round(20 * Math.log10(Math.max(0.0001, trackingState.inputLevel))));
  const levelWidth = Math.min(100, Math.max(0, trackingState.inputLevel * 250));

  return (
    <div className="rounded-2xl bg-gradient-to-r from-slate-950/95 via-slate-900/90 to-slate-950/95 border border-cyan-500/30 p-3.5 backdrop-blur-xl shadow-xl space-y-3">
      {/* Top Controls Row */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Mic Activation Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleMicrophone}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              trackingState.isTrackingActive
                ? trackingState.isVirtualFeed
                  ? 'bg-purple-500 text-slate-950 shadow-lg shadow-purple-500/30 ring-2 ring-purple-400/50'
                  : 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400/50'
                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title={trackingState.isTrackingActive ? 'Disconnect Input' : 'Enable Studio Microphone'}
          >
            {trackingState.isTrackingActive ? (
              <Mic className="w-5 h-5 animate-pulse" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </button>

          <div>
            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>Studio Vocal Tracking</span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                  trackingState.isTrackingActive
                    ? trackingState.isVirtualFeed
                      ? 'bg-purple-950 text-purple-300 border border-purple-800/50'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                    : 'bg-white/5 text-slate-500'
                }`}
              >
                {trackingState.isTrackingActive
                  ? trackingState.isVirtualFeed
                    ? 'VIRTUAL VOCAL FEED'
                    : '48kHz HARDWARE'
                  : 'STANDBY'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {trackingState.isVirtualFeed
                ? 'Routing studio acapella feed through live DSP tuning rack'
                : 'Zero-latency DSP vocal monitoring & multi-take capture'}
            </div>
          </div>
        </div>

        {/* Right: Direct Monitoring & REC TAKE Button */}
        <div className="flex items-center gap-2">
          {/* Virtual Feed Quick Switcher */}
          {!trackingState.isTrackingActive && (
            <button
              onClick={handleActivateVirtualFeed}
              className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-purple-300 flex items-center gap-1 transition-colors"
              title="Activate Virtual Vocal Feed"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Virtual</span>
              <span>Feed</span>
            </button>
          )}

          {/* Headphone Direct Monitoring Toggle */}
          <button
            onClick={handleToggleMonitoring}
            disabled={!trackingState.isTrackingActive}
            className={`px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-30 ${
              trackingState.isDirectMonitoring
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200'
            }`}
            title="Direct Headphone Monitoring"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Monitor:</span>
            <span>{trackingState.isDirectMonitoring ? 'ON' : 'MUTE'}</span>
          </button>

          {/* REC TAKE Button */}
          <button
            onClick={handleToggleTakeRecording}
            disabled={!trackingState.isTrackingActive}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-30 ${
              trackingState.isRecordingTake
                ? 'bg-rose-500 text-white shadow-rose-500/30 animate-pulse ring-2 ring-rose-400'
                : 'bg-white/10 text-slate-200 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 border border-white/10'
            }`}
          >
            {trackingState.isRecordingTake ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>{recDuration.toFixed(1)}s</span>
              </>
            ) : (
              <>
                <Circle className="w-3.5 h-3.5 fill-current text-rose-500" />
                <span>Rec Take</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Helpful Permission Warning & Virtual Feed Fallback CTA */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-slate-900 border border-purple-500/30 text-xs space-y-2">
          <div className="flex items-start gap-2 text-slate-300">
            <AlertCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-slate-100">Microphone Permission Notice: </span>
              <span>{errorMessage}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleActivateVirtualFeed}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/20 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Activate Virtual Studio Vocal Feed</span>
            </button>
            <button
              onClick={handleToggleMicrophone}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Mic</span>
            </button>
          </div>
        </div>
      )}

      {/* Live Input Meter & Preamp Gain Slider */}
      {trackingState.isTrackingActive && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5 items-center">
          {/* Input RMS VU Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>{trackingState.isVirtualFeed ? 'VIRTUAL VOCAL LEVEL:' : 'MIC INPUT LEVEL:'}</span>
              <span className={`font-semibold ${trackingState.inputLevel > 0.9 ? 'text-rose-400' : 'text-cyan-300'}`}>
                {inputLevelDb <= -60 ? '-inf' : `${inputLevelDb} dB`}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full rounded-full transition-all duration-75"
                style={{
                  width: `${levelWidth}%`,
                  background:
                    trackingState.inputLevel > 0.85
                      ? '#f43f5e'
                      : trackingState.inputLevel > 0.6
                      ? '#fbbf24'
                      : trackingState.isVirtualFeed
                      ? 'linear-gradient(90deg, #a855f7, #06b6d4)'
                      : 'linear-gradient(90deg, #06b6d4, #10b981)'
                }}
              />
            </div>
          </div>

          {/* Mic Preamp Gain Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>PREAMP GAIN:</span>
              <span className="text-cyan-300 font-semibold">{micGain.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={2.5}
              step={0.1}
              value={micGain}
              onChange={(e) => handleGainChange(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Recorded Takes Drawer Header */}
      {trackingState.takes.length > 0 && (
        <div className="pt-2 border-t border-white/5">
          <button
            onClick={() => setTakesDrawerOpen(!takesDrawerOpen)}
            className="w-full flex items-center justify-between text-xs text-slate-300 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-1.5 font-semibold">
              <span>Recorded Vocal Takes</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                {trackingState.takes.length}
              </span>
            </span>
            {takesDrawerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Takes Drawer Body */}
          {takesDrawerOpen && (
            <div className="mt-2.5 space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {trackingState.takes.map((take) => (
                <div
                  key={take.id}
                  className="p-2 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAuditionTake(take)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        auditioningTakeId === take.id
                          ? 'bg-cyan-400 text-slate-950 font-bold'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                      title="Audition Take"
                    >
                      {auditioningTakeId === take.id ? (
                        <Square className="w-3 h-3 fill-current" />
                      ) : (
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      )}
                    </button>

                    <div>
                      <div className="font-semibold text-slate-200">{take.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {take.durationSec.toFixed(1)}s · 48kHz PCM
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const blob = new Blob([take.buffer.getChannelData(0)], { type: 'audio/wav' });
                        downloadBlob(blob, `${take.name}.wav`);
                      }}
                      className="p-1.5 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-white/5"
                      title="Download Take"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (engine.liveTracking) {
                          engine.liveTracking.recordedTakes = engine.liveTracking.recordedTakes.filter(
                            (t) => t.id !== take.id
                          );
                          setTrackingState((prev) => ({
                            ...prev,
                            takes: prev.takes.filter((t) => t.id !== take.id)
                          }));
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-white/5"
                      title="Delete Take"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
