/**
 * AURA DSP - Piano & Boutique Synthesizer Engine
 * Features:
 * - Continuous Touch Glissando & Legato Sliding across keys (FL Studio / Drill 808 slides)
 * - Tactile 808 Pitch Slide Ribbon Controller for expressive microtonal glides
 * - Old School (Rhodes Suitcase, Vintage Moog Bass, Juno-106) vs New School (808 Glide Sub, Drill Bell, Hyperpop Saw)
 * - Portamento / Glide engine with real-time frequency interpolation
 * - One-Touch Chord Mode with natural humanized strum staggering
 * - Vibration API tactile haptic key response
 * - Musical scale locking (Chromatic, Harm Minor, Dorian, Pentatonic, Blues, Major)
 */

import React, { useState, useEffect, useRef } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import { MidiNote, SynthPatch } from '../types/audio';
import {
  Play,
  Square,
  Music,
  Sliders,
  Sparkles,
  Layers,
  Volume2,
  Vibrate,
  Activity,
  Flame
} from 'lucide-react';

interface ScaleFormula {
  id: string;
  name: string;
  intervals: number[];
}

const MUSICAL_SCALES: ScaleFormula[] = [
  { id: 'chromatic', name: 'Chromatic', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { id: 'c_harm_minor', name: 'C Harm. Minor', intervals: [0, 2, 3, 5, 7, 8, 11] },
  { id: 'a_minor', name: 'A Natural Minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'f_dorian', name: 'F Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'g_pentatonic', name: 'G Minor Pentatonic', intervals: [0, 3, 5, 7, 10] },
  { id: 'c_major', name: 'C Major', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'blues', name: 'Blues Scale', intervals: [0, 3, 5, 6, 7, 10] }
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const SYNTH_PATCHES: { id: SynthPatch; name: string; era: 'old_school' | 'new_school'; desc: string }[] = [
  { id: '808_glide_sub', name: '808 Glide Sub', era: 'new_school', desc: 'Sliding bassline with drill portamento' },
  { id: 'rhodes_suitcase', name: 'Vintage Rhodes', era: 'old_school', desc: '70s tine electric piano with tremolo' },
  { id: 'vintage_moog_bass', name: 'Minimoog Bass', era: 'old_school', desc: 'Warm 24dB ladder filter saw/square' },
  { id: 'juno_warm_poly', name: 'Juno-106 Pad', era: 'old_school', desc: 'Lush 80s chorus analog poly synth' },
  { id: 'hyperpop_saw_lead', name: 'Hyperpop Saw', era: 'new_school', desc: 'Detuned supersaw with high-frequency bite' },
  { id: 'drill_bell_pluck', name: 'Drill Bell Pluck', era: 'new_school', desc: 'Resonant FM chime with harmonic sparkle' }
];

export const PianoView: React.FC = () => {
  const engine = AudioEngine.getInstance();
  const [octaveOffset, setOctaveOffset] = useState<number>(3); // Default lower for punchy rap 808s
  const [selectedScale, setSelectedScale] = useState<string>('c_harm_minor');
  const [synthPatch, setSynthPatch] = useState<SynthPatch>(engine.synthSettings.patch);
  const [glideMs, setGlideMs] = useState<number>(engine.synthSettings.glideTimeMs);
  const [chordMode, setChordMode] = useState<boolean>(engine.synthSettings.chordMode);
  const [chordType, setChordType] = useState(engine.synthSettings.chordType);
  const [filterCutoff, setFilterCutoff] = useState<number>(engine.synthSettings.filterCutoff);

  // Sliding / Glissando state
  const [isSlideMode, setIsSlideMode] = useState<boolean>(true);
  const [slidingPitch, setSlidingPitch] = useState<number | null>(null);
  const [isRibbonActive, setIsRibbonActive] = useState<boolean>(false);
  const [ribbonBendSemitones, setRibbonBendSemitones] = useState<number>(0);
  const ribbonRef = useRef<HTMLDivElement | null>(null);

  const [activeNotes, setActiveNotes] = useState<MidiNote[]>([
    { id: 'n1', pitch: 48, step: 0, length: 2, velocity: 90 },
    { id: 'n2', pitch: 51, step: 4, length: 2, velocity: 85 },
    { id: 'n3', pitch: 55, step: 8, length: 2, velocity: 95 },
    { id: 'n4', pitch: 58, step: 12, length: 2, velocity: 90 }
  ]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [pressedKey, setPressedKey] = useState<number | null>(null);

  const baseMidi = octaveOffset * 12;
  const pitches = Array.from({ length: 13 }, (_, i) => baseMidi + 12 - i);

  const activeScaleDef = MUSICAL_SCALES.find((s) => s.id === selectedScale) || MUSICAL_SCALES[0];

  const isPitchInScale = (midi: number) => {
    const pitchClass = (midi % 12 + 12) % 12;
    return activeScaleDef.intervals.includes(pitchClass);
  };

  // Retrigger single key tap
  const handleKeyTrigger = async (midi: number) => {
    await engine.initAudio();
    engine.playNote(midi, 0.9, 0.7);
    engine.triggerHaptic('melodic');
    setPressedKey(midi);
    setTimeout(() => setPressedKey(null), 200);
  };

  // Continuous pointer dragging glissando across keyboard
  const handlePointerDownKey = async (midi: number) => {
    await engine.initAudio();
    setPressedKey(midi);
    setSlidingPitch(midi);

    if (isSlideMode) {
      engine.startSustainedNote(midi, 0.9);
      engine.triggerHaptic('melodic');
    } else {
      engine.playNote(midi, 0.9, 0.7);
      engine.triggerHaptic('melodic');
    }
  };

  const handlePointerEnterKey = (midi: number, buttons: number) => {
    if (buttons === 0 && !slidingPitch) return;
    setPressedKey(midi);
    setSlidingPitch(midi);

    if (isSlideMode) {
      engine.slideHeldNote(midi);
      engine.triggerHaptic('melodic');
    } else {
      engine.playNote(midi, 0.85, 0.5);
      engine.triggerHaptic('melodic');
    }
  };

  const handlePointerUpKeyboard = () => {
    if (isSlideMode) {
      engine.releaseSustainedNote();
    }
    setPressedKey(null);
    setSlidingPitch(null);
  };

  // 808 Slide / Pitch Bend Ribbon Controller
  const handleRibbonPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ribbonRef.current) return;
    setIsRibbonActive(true);
    ribbonRef.current.setPointerCapture(e.pointerId);
    handleRibbonMove(e);
  };

  const handleRibbonMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isRibbonActive || !ribbonRef.current) return;
    const rect = ribbonRef.current.getBoundingClientRect();
    const xNorm = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    // Ribbon slides from -12 semitones to +12 semitones
    const bend = Math.round((xNorm - 0.5) * 24);
    setRibbonBendSemitones(bend);

    const basePitch = slidingPitch || (baseMidi + 5); // default F
    const targetPitch = basePitch + bend;
    engine.slideHeldNote(targetPitch);
    engine.triggerHaptic('melodic');
  };

  const handleRibbonPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsRibbonActive(false);
    setRibbonBendSemitones(0);
    try {
      if (ribbonRef.current?.hasPointerCapture(e.pointerId)) {
        ribbonRef.current.releasePointerCapture(e.pointerId);
      }
    } catch {}
    if (!pressedKey) {
      engine.releaseSustainedNote();
    }
  };

  const handlePatchChange = (patch: SynthPatch) => {
    setSynthPatch(patch);
    engine.synthSettings.patch = patch;
  };

  const handleGlideChange = (val: number) => {
    setGlideMs(val);
    engine.synthSettings.glideTimeMs = val;
  };

  const handleChordModeToggle = () => {
    const updated = !chordMode;
    setChordMode(updated);
    engine.synthSettings.chordMode = updated;
  };

  const handleChordTypeChange = (type: any) => {
    setChordType(type);
    engine.synthSettings.chordType = type;
  };

  const handleCanvasCellClick = (pitch: number, step: number) => {
    const existingIdx = activeNotes.findIndex((n) => n.pitch === pitch && n.step === step);
    if (existingIdx >= 0) {
      setActiveNotes((prev) => prev.filter((_, idx) => idx !== existingIdx));
    } else {
      const newNote: MidiNote = {
        id: `n_${Date.now()}_${Math.random()}`,
        pitch,
        step,
        length: 1,
        velocity: 88
      };
      setActiveNotes((prev) => [...prev, newNote]);
      engine.playNote(pitch, 0.85, 0.5);
      engine.triggerHaptic('melodic');
    }
  };

  // Step sequencer loop for piano notes
  useEffect(() => {
    if (!isPlaying) return;
    const interval = (60000 / engine.grooveSettings.tempoBpm) / 4;
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        const next = (prev + 1) % 16;
        const notesOnStep = activeNotes.filter((n) => n.step === next);
        notesOnStep.forEach((note) => {
          engine.playNote(note.pitch, note.velocity / 100, 0.35);
        });
        return next;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [isPlaying, activeNotes, engine.grooveSettings.tempoBpm]);

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-300">
      {/* SYNTH CONTROLS HEADER */}
      <div className="rounded-2xl bg-slate-950/80 border border-white/10 p-3.5 backdrop-blur-xl shadow-xl space-y-3">
        {/* Row 1: Patch selector & Transport */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Aura Synth & 808 Sliding Engine
              </h2>
              <p className="text-[10px] text-slate-400">
                Continuous glissando, legato pitch slides & chord strumming
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Slide Mode Toggle */}
            <button
              onClick={() => setIsSlideMode(!isSlideMode)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all border ${
                isSlideMode
                  ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-sm shadow-cyan-500/20'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isSlideMode ? 'SLIDE: ON' : 'SLIDE: OFF'}</span>
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              }`}
            >
              {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'STOP' : 'PLAY'}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Patch preset drawer */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {SYNTH_PATCHES.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePatchChange(p.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all border ${
                synthPatch === p.id
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-200 shadow-sm shadow-purple-500/20 font-semibold'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Row 3: Portamento Glide, Octave, and Chord Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-white/5 text-xs">
          {/* Glide Time Slider */}
          <div className="bg-white/5 rounded-xl p-2 border border-white/5">
            <div className="flex justify-between items-center mb-1 text-[10px] text-slate-400 font-mono">
              <span>PORTAMENTO GLIDE</span>
              <span className="text-cyan-400 font-bold">{glideMs}ms</span>
            </div>
            <input
              type="range"
              min={0}
              max={300}
              step={5}
              value={glideMs}
              onChange={(e) => handleGlideChange(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
          </div>

          {/* Octave Shifter */}
          <div className="bg-white/5 rounded-xl p-2 border border-white/5 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono">OCTAVE</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setOctaveOffset((o) => Math.max(1, o - 1))}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold"
              >
                -
              </button>
              <span className="font-mono text-cyan-400 font-bold px-1 text-sm">C{octaveOffset}</span>
              <button
                onClick={() => setOctaveOffset((o) => Math.min(6, o + 1))}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* Chord Mode Toggle & Type */}
          <div className="col-span-2 bg-white/5 rounded-xl p-2 border border-white/5 flex items-center justify-between gap-2">
            <button
              onClick={handleChordModeToggle}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                chordMode
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                  : 'bg-slate-900 border-white/10 text-slate-400'
              }`}
            >
              Chord Mode: {chordMode ? 'ON' : 'OFF'}
            </button>

            {chordMode && (
              <select
                value={chordType}
                onChange={(e) => handleChordTypeChange(e.target.value)}
                className="bg-slate-900 text-xs font-mono text-purple-300 border border-white/10 rounded-lg px-2 py-1 focus:outline-none"
              >
                <option value="trap_minor">Trap Minor</option>
                <option value="maj9">Major 9th</option>
                <option value="min11">Minor 11th</option>
                <option value="neo_soul">Neo-Soul</option>
                <option value="power">Power 5th</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Musical Scale Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {MUSICAL_SCALES.map((scale) => (
          <button
            key={scale.id}
            onClick={() => setSelectedScale(scale.id)}
            className={`px-3 py-1.5 text-[11px] font-medium rounded-xl whitespace-nowrap transition-colors ${
              selectedScale === scale.id
                ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {scale.name}
          </button>
        ))}
      </div>

      {/* 808 PITCH SLIDE RIBBON CONTROLLER */}
      <div className="rounded-2xl bg-slate-950/90 border border-white/10 p-3 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-300 mb-2">
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-slate-100">808 & Drill Slide Ribbon</span>
          </div>
          <span className="font-mono text-cyan-400">
            {isRibbonActive ? `${ribbonBendSemitones >= 0 ? `+${ribbonBendSemitones}` : ribbonBendSemitones} st Glide` : 'Touch & Drag to Slide'}
          </span>
        </div>

        <div
          ref={ribbonRef}
          onPointerDown={handleRibbonPointerDown}
          onPointerMove={handleRibbonMove}
          onPointerUp={handleRibbonPointerUp}
          onPointerCancel={handleRibbonPointerUp}
          className="relative h-11 rounded-xl bg-gradient-to-r from-purple-950/50 via-cyan-950/40 to-purple-950/50 border border-cyan-500/30 overflow-hidden cursor-ew-resize select-none touch-none flex items-center justify-center shadow-inner"
        >
          {/* Center detent mark */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-cyan-400/50 pointer-events-none" />

          {/* Dynamic slide glow indicator */}
          {isRibbonActive && (
            <div
              className="absolute top-0 bottom-0 w-12 bg-cyan-400/40 blur-md pointer-events-none transition-transform"
              style={{
                left: `${50 + (ribbonBendSemitones / 24) * 50}%`,
                transform: 'translateX(-50%)'
              }}
            />
          )}

          <div className="text-[10px] font-mono font-bold tracking-widest text-cyan-300/80 pointer-events-none uppercase">
            ◄ SLIDE DOWN (-12st) &nbsp;&nbsp;|&nbsp;&nbsp; SLIDE UP (+12st) ►
          </div>
        </div>
      </div>

      {/* MIDI STEP CANVAS */}
      <div className="rounded-2xl bg-slate-950/90 border border-white/10 p-3 backdrop-blur-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[420px]">
            <div className="grid grid-cols-16 ml-12 gap-1 mb-1">
              {Array.from({ length: 16 }).map((_, s) => (
                <div
                  key={s}
                  className={`text-center text-[8px] font-mono py-0.5 rounded ${
                    isPlaying && currentStep === s
                      ? 'bg-cyan-500/40 text-cyan-200 font-bold'
                      : s % 4 === 0
                      ? 'text-slate-400 font-semibold'
                      : 'text-slate-600'
                  }`}
                >
                  {s + 1}
                </div>
              ))}
            </div>

            <div className="space-y-1">
              {pitches.map((pitch) => {
                const noteName = NOTE_NAMES[pitch % 12];
                const octaveNum = Math.floor(pitch / 12) - 1;
                const isBlack = noteName.includes('#');
                const inScale = isPitchInScale(pitch);

                return (
                  <div key={pitch} className="flex items-center gap-1">
                    <button
                      onClick={() => handleKeyTrigger(pitch)}
                      className={`w-11 h-6 rounded-md text-[10px] font-mono flex items-center justify-between px-1.5 transition-colors shrink-0 ${
                        pressedKey === pitch
                          ? 'bg-cyan-400 text-slate-950 font-bold'
                          : isBlack
                          ? 'bg-slate-900 border border-white/10 text-slate-300'
                          : 'bg-slate-800 border border-white/10 text-slate-200'
                      } ${!inScale ? 'opacity-40' : ''}`}
                    >
                      <span>{noteName}</span>
                      <span className="text-[8px] text-slate-500">{octaveNum}</span>
                    </button>

                    <div className="grid grid-cols-16 flex-1 gap-1">
                      {Array.from({ length: 16 }).map((_, s) => {
                        const hasNote = activeNotes.some((n) => n.pitch === pitch && n.step === s);
                        const isCurrentPlaying = isPlaying && currentStep === s;
                        const isBeatBoundary = s % 4 === 0;

                        return (
                          <button
                            key={s}
                            onClick={() => handleCanvasCellClick(pitch, s)}
                            className={`h-6 rounded transition-all ${
                              hasNote
                                ? 'bg-gradient-to-r from-cyan-400 to-purple-400 shadow-md shadow-cyan-500/30'
                                : isCurrentPlaying
                                ? 'bg-cyan-900/40 border border-cyan-500/30'
                                : isBeatBoundary
                                ? 'bg-slate-900 hover:bg-slate-800 border border-white/5'
                                : 'bg-slate-950 hover:bg-slate-900 border border-white/5'
                            } ${!inScale && !hasNote ? 'opacity-30' : ''}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* TACTILE TOUCH PIANO KEYBOARD WITH CONTINUOUS GLISSANDO SLIDING */}
      <div className="rounded-2xl bg-slate-950/90 border border-white/10 p-3 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-2">
          <span>Continuous Touch Glide Piano (Drag across keys to slide)</span>
          <span className="font-mono text-cyan-400">
            {slidingPitch !== null ? `${NOTE_NAMES[slidingPitch % 12]}${Math.floor(slidingPitch / 12) - 1} Sliding` : 'Ready'}
          </span>
        </div>
        <div
          onPointerUp={handlePointerUpKeyboard}
          onPointerLeave={handlePointerUpKeyboard}
          className="relative flex justify-between h-36 rounded-xl overflow-hidden bg-slate-900 border border-white/10 select-none touch-none shadow-2xl"
        >
          {/* White keys */}
          {[0, 2, 4, 5, 7, 9, 11, 12].map((interval) => {
            const pitch = baseMidi + interval;
            const inScale = isPitchInScale(pitch);
            const isPressed = pressedKey === pitch || slidingPitch === pitch;

            return (
              <button
                key={pitch}
                onPointerDown={() => handlePointerDownKey(pitch)}
                onPointerEnter={(e) => handlePointerEnterKey(pitch, e.buttons)}
                className={`flex-1 mx-0.5 rounded-b-xl border border-slate-700/50 flex flex-col justify-end pb-2 items-center transition-all ${
                  isPressed
                    ? 'bg-gradient-to-b from-cyan-300 to-cyan-400 text-slate-950 font-bold scale-[0.98] shadow-lg shadow-cyan-500/40'
                    : inScale
                    ? 'bg-gradient-to-b from-slate-100 to-slate-300 text-slate-900 active:bg-cyan-200'
                    : 'bg-slate-700/40 text-slate-500 opacity-60'
                }`}
              >
                <span className="text-[11px] font-bold font-mono">
                  {NOTE_NAMES[pitch % 12]}
                </span>
                <span className="text-[8px] text-slate-500 font-mono">
                  {Math.floor(pitch / 12) - 1}
                </span>
              </button>
            );
          })}

          {/* Black Keys */}
          {[
            { interval: 1, leftPercent: '9%' },
            { interval: 3, leftPercent: '21.5%' },
            { interval: 6, leftPercent: '46.5%' },
            { interval: 8, leftPercent: '59%' },
            { interval: 10, leftPercent: '71.5%' }
          ].map(({ interval, leftPercent }) => {
            const pitch = baseMidi + interval;
            const inScale = isPitchInScale(pitch);
            const isPressed = pressedKey === pitch || slidingPitch === pitch;

            return (
              <button
                key={pitch}
                onPointerDown={() => handlePointerDownKey(pitch)}
                onPointerEnter={(e) => handlePointerEnterKey(pitch, e.buttons)}
                style={{ left: leftPercent }}
                className={`absolute top-0 w-[7.5%] h-24 rounded-b-lg z-20 flex flex-col justify-end pb-2 items-center transition-all ${
                  isPressed
                    ? 'bg-cyan-400 text-slate-950 font-bold scale-[0.97] shadow-lg shadow-cyan-500/50'
                    : inScale
                    ? 'bg-slate-950 border border-white/20 text-cyan-300 active:bg-cyan-900 shadow-md'
                    : 'bg-slate-900 border border-white/5 text-slate-600 opacity-40'
                }`}
              >
                <span className="text-[9px] font-bold font-mono">
                  {NOTE_NAMES[pitch % 12]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
