/**
 * AURA DSP - Modular Plugin Rack Dashboard
 * Clean UI Architecture: Plugins MUST be activated to appear in the rack.
 * Inactive plugins live cleanly in the Plugin Boutique Drawer.
 * 
 * Includes 6 Hardware-Emulated DSP Plugins:
 * 1. Vocal Pitch & Formant Shaper
 * 2. Warm Multi-Band Analog & Soft-Clipper
 * 3. Spatial Acoustic Reverb & M/S Width
 * 4. SP-404 / 12-Bit Vinyl Lo-Fi Degradation (Old School)
 * 5. Dynamic Transient Shaper (Punch & Slap)
 * 6. Rhythmic Sidechain Pumper (Modern Ducking)
 */

import React, { useState } from 'react';
import { TactileKnob } from './TactileKnob';
import { SpectralVisualizer } from './SpectralVisualizer';
import { LiveVocalTrackingRibbon } from './LiveVocalTrackingRibbon';
import { AudioEngine } from '../audio/AudioEngine';
import { FxRackParameters, PluginType, PluginDefinition } from '../types/audio';
import {
  Mic,
  Disc3,
  Waves,
  Radio,
  Zap,
  Activity,
  Plus,
  Trash2,
  Power,
  Volume2,
  Play,
  Square,
  Sparkles,
  X,
  ChevronDown,
  Layers,
  Compass,
  Clock,
  Wind,
  Gauge
} from 'lucide-react';

const PLUGIN_CATALOG: PluginDefinition[] = [
  {
    type: 'vocal_pitch',
    name: 'Vocal Pitch & Formant Shaper',
    category: 'Vocal',
    description: 'Phase-vocoder pitch quantizer, scale snapping & vocal tract throat formant modeling.',
    iconName: 'Mic',
    color: 'cyan',
    era: 'new_school',
    hardwareInspiration: 'Antares Auto-Tune Pro / Melodyne'
  },
  {
    type: 'analog_multiband',
    name: 'Warm Multi-Band Analog & Soft Clipper',
    category: 'Dynamics',
    description: 'Linkwitz-Riley 3-band crossover, analog tanh saturation & FL Studio soft-clipper ceiling.',
    iconName: 'Disc3',
    color: 'purple',
    era: 'timeless',
    hardwareInspiration: 'Neve 33609 / Tube-Tech SMC 2B'
  },
  {
    type: 'spatial_reverb',
    name: 'Spatial Acoustic Reverb & Imager',
    category: 'Space',
    description: 'Schroeder-Moorer matrix diffuser with Mid/Side stereophonic spatial expansion.',
    iconName: 'Waves',
    color: 'mint',
    era: 'timeless',
    hardwareInspiration: 'Lexicon 480L / Bricasti M7'
  },
  {
    type: 'sp404_lofi',
    name: 'SP-404 Vinyl & 12-Bit Grime',
    category: 'Vintage',
    description: 'Vintage DAC rate decimation, 12-bit SP-1200 crunch, stochastic vinyl crackle & wow/flutter.',
    iconName: 'Radio',
    color: 'amber',
    era: 'old_school',
    hardwareInspiration: 'Roland SP-404 MK2 / E-mu SP-1200'
  },
  {
    type: 'transient_shaper',
    name: 'Dynamic Transient Punch Shaper',
    category: 'Dynamics',
    description: 'Dual-envelope transient detector to inject violent snap into 808s and acoustic drums.',
    iconName: 'Zap',
    color: 'emerald',
    era: 'new_school',
    hardwareInspiration: 'SPL Transient Designer'
  },
  {
    type: 'sidechain_pumper',
    name: 'Rhythmic Sidechain Pumper',
    category: 'Modern',
    description: 'Rhythmic 4-on-the-floor exponential ducking envelope for French touch and Jersey club bounce.',
    iconName: 'Activity',
    color: 'rose',
    era: 'new_school',
    hardwareInspiration: 'Cableguys VolumeShaper / LFO Tool'
  },
  {
    type: 'dimension_chorus',
    name: 'Dimension Chorus & Stereo Expander',
    category: 'Space',
    description: '4-button discrete spatial BBD analog chorus thickener with quadrature dual LFO modulation.',
    iconName: 'Compass',
    color: 'cyan',
    era: 'timeless',
    hardwareInspiration: 'Roland SDD-320 Dimension D / Juno BBD'
  },
  {
    type: 'tape_delay',
    name: 'Space Echo & Analog Tape Delay',
    category: 'Vintage',
    description: 'Multi-head tape feedback loop with saturating analog warmth, ping-pong stereophony & wow warble.',
    iconName: 'Clock',
    color: 'amber',
    era: 'old_school',
    hardwareInspiration: 'Roland RE-201 Space Echo / Soundtoys EchoBoy'
  },
  {
    type: 'spectral_deesser',
    name: 'Spectral De-Esser & 20kHz Air EQ',
    category: 'Vocal',
    description: 'Ultra-fast frequency-selective sibilance attenuator paired with silky +12dB 20kHz Maag Air Band.',
    iconName: 'Wind',
    color: 'purple',
    era: 'timeless',
    hardwareInspiration: 'FabFilter Pro-DS & Mäag Audio EQ4'
  },
  {
    type: 'hyper_ott',
    name: 'OTT Upward/Downward Hyper-Compressor',
    category: 'Dynamics',
    description: 'Aggressive upward expansion for buried details paired with brickwall downward transient clamping.',
    iconName: 'Gauge',
    color: 'rose',
    era: 'new_school',
    hardwareInspiration: 'Xfer Records OTT / Ableton Multiband'
  },
  {
    type: 'pultec_eq',
    name: 'Pultec EQP-1A Tube Program Equalizer',
    category: 'Vintage',
    description: '1970s passive tube EQ with simultaneous low-end boost and attenuation trick for resonant sub punch.',
    iconName: 'Sparkles',
    color: 'amber',
    era: '70s',
    hardwareInspiration: 'Pulse Techniques Pultec EQP-1A'
  },
  {
    type: 'ssl_bus_comp',
    name: 'SSL 4000 G-Bus Console Compressor',
    category: 'Dynamics',
    description: '1980s British console master bus VCA glue compressor with auto-release and ratio control.',
    iconName: 'Zap',
    color: 'purple',
    era: '80s',
    hardwareInspiration: 'Solid State Logic SL4000G Console'
  },
  {
    type: 'asr10_sampler_grit',
    name: 'Ensoniq ASR-10 Resampling Sampler Grit',
    category: 'Vintage',
    description: '1990s golden-era hip-hop sampler bit-crush and DAC converter warmth (Wu-Tang / Kanye signature sound).',
    iconName: 'Radio',
    color: 'amber',
    era: '90s',
    hardwareInspiration: 'Ensoniq ASR-10 Advanced Sampling Recorder'
  },
  {
    type: 'tube_heat',
    name: 'Pentode Tube Heat Saturator',
    category: 'Modern',
    description: '2010s Atlanta trap pentode tube saturation, asymmetric clipping and low-end sub fatness.',
    iconName: 'Disc3',
    color: 'rose',
    era: '2010s',
    hardwareInspiration: 'Thermionic Culture Vulture / FabFilter Saturn'
  },
  {
    type: 'resonance_suppressor',
    name: 'Dynamic Resonance Suppressor',
    category: 'Modern',
    description: '2020s adaptive spectral harshness and boxiness eliminator for crystal-clear modern rap/pop vocals.',
    iconName: 'Activity',
    color: 'cyan',
    era: '2020s',
    hardwareInspiration: 'oeksound soothe2'
  }
];

interface FxRackViewProps {
  onOpenTranslator: () => void;
  onOpenQuickExport: () => void;
}

export const FxRackView: React.FC<FxRackViewProps> = ({
  onOpenTranslator,
  onOpenQuickExport
}) => {
  const engine = AudioEngine.getInstance();
  const [params, setParams] = useState<FxRackParameters>({ ...engine.currentParams });
  const [activePlugins, setActivePlugins] = useState<PluginType[]>(
    engine.activePlugins.filter((p) => p.enabled).map((p) => p.type)
  );
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isDemoPlaying, setIsDemoPlaying] = useState(engine.isStemLooping);

  const handleParamChange = <K extends keyof FxRackParameters>(key: K, val: FxRackParameters[K]) => {
    setParams((prev) => ({ ...prev, [key]: val }));
    engine.updateParam(key, val);
  };

  const handleToggleDemoStems = async () => {
    await engine.initAudio();
    engine.toggleStemPlayback();
    setIsDemoPlaying(engine.isStemLooping);
  };

  const handleActivatePlugin = (type: PluginType) => {
    engine.activatePlugin(type);
    setActivePlugins((prev) => (prev.includes(type) ? prev : [...prev, type]));
    setParams({ ...engine.currentParams });
    setIsCatalogOpen(false);
  };

  const handleRemovePlugin = (type: PluginType) => {
    engine.removePlugin(type);
    setActivePlugins((prev) => prev.filter((t) => t !== type));
    setParams({ ...engine.currentParams });
  };

  const handleToggleBypass = (type: PluginType) => {
    engine.togglePluginBypass(type);
    setParams({ ...engine.currentParams });
  };

  return (
    <div className="space-y-4 pb-20">
      {/* 60 FPS Visualizer Dock */}
      <SpectralVisualizer />

      {/* Studio Vocal Live Tracking & Monitoring Ribbon */}
      <LiveVocalTrackingRibbon />

      {/* Audition & Add Plugin Control Ribbon */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90 border border-white/10 p-3 backdrop-blur-xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleDemoStems}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              isDemoPlaying
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-400/40 animate-pulse'
                : 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 active:scale-95'
            }`}
            title="Toggle Demo Stems"
          >
            {isDemoPlaying ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>
          <div>
            <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              <span>Dual-Stem Audition</span>
              <span className="text-[10px] text-cyan-400 font-mono">48kHz Lossless</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Vocal Stem + Trap Beat routed through active DSP rack ({activePlugins.length} active)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Plugin Button */}
          <button
            onClick={() => setIsCatalogOpen(true)}
            className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 hover:from-cyan-300 hover:to-teal-200 rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Plugin</span>
          </button>

          <button
            onClick={onOpenTranslator}
            className="p-2 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors hidden sm:flex items-center"
            title="Open PC Translator"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
          </button>
        </div>
      </div>

      {/* ACTIVE PLUGINS RACK LIST */}
      {activePlugins.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center bg-slate-950/40 backdrop-blur-xl">
          <Layers className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Rack is Empty</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            Activate plugins from the boutique drawer to add them to your mobile signal chain.
          </p>
          <button
            onClick={() => setIsCatalogOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Browse Plugin Boutique</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 1. VOCAL PITCH & FORMANT SHAPER */}
          {activePlugins.includes('vocal_pitch') && (
            <div className="rounded-2xl bg-slate-950/75 border border-cyan-500/25 p-4 backdrop-blur-xl shadow-xl transition-all">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
                        Vocal Pitch & Formant Shaper
                      </h3>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
                        ANTARES / MELODYNE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Phase-vocoder pitch quantizer & natural throat formant modeling
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBypass('vocal_pitch')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                      params.vocalPitchEnabled
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-white/5 text-slate-500 border border-white/5'
                    }`}
                  >
                    {params.vocalPitchEnabled ? 'ACTIVE' : 'BYPASS'}
                  </button>
                  <button
                    onClick={() => handleRemovePlugin('vocal_pitch')}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Remove from Rack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scale Selector */}
              <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <span className="text-[11px] text-slate-400 whitespace-nowrap">Scale Lock:</span>
                {[
                  { id: 'chromatic', label: 'Chromatic' },
                  { id: 'c_harmonic_minor', label: 'C Harm. Minor' },
                  { id: 'a_minor', label: 'A Minor' },
                  { id: 'f_dorian', label: 'F Dorian' },
                  { id: 'g_pentatonic', label: 'G Pentatonic' },
                  { id: 'c_major', label: 'C Major' }
                ].map((scale) => (
                  <button
                    key={scale.id}
                    onClick={() => handleParamChange('vocalScale', scale.id as any)}
                    className={`px-2.5 py-1 text-[10px] font-medium rounded-lg whitespace-nowrap transition-colors ${
                      params.vocalScale === scale.id
                        ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {scale.label}
                  </button>
                ))}
              </div>

              {/* Rotary Knobs Grid */}
              <div className="grid grid-cols-4 gap-2">
                <TactileKnob
                  label="Tune Speed"
                  value={params.vocalTuneSpeed}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={70}
                  accentColor="cyan"
                  onChange={(val) => handleParamChange('vocalTuneSpeed', val)}
                />
                <TactileKnob
                  label="Formant"
                  value={params.vocalFormantShift}
                  min={-12}
                  max={12}
                  step={0.5}
                  unit="st"
                  defaultValue={0}
                  accentColor="cyan"
                  onChange={(val) => handleParamChange('vocalFormantShift', val)}
                />
                <TactileKnob
                  label="Humanize"
                  value={params.vocalHumanizeVibrato}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={20}
                  accentColor="cyan"
                  onChange={(val) => handleParamChange('vocalHumanizeVibrato', val)}
                />
                <TactileKnob
                  label="Wet / Dry"
                  value={params.vocalWetDry}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={70}
                  accentColor="cyan"
                  onChange={(val) => handleParamChange('vocalWetDry', val)}
                />
              </div>
            </div>
          )}

          {/* 2. WARM MULTI-BAND ANALOG & SOFT-CLIPPER */}
          {activePlugins.includes('analog_multiband') && (
            <div className="rounded-2xl bg-slate-950/75 border border-purple-500/25 p-4 backdrop-blur-xl shadow-xl transition-all">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Disc3 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
                        Warm Multi-Band Analog & Soft-Clipper
                      </h3>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/40">
                        FL SOFT-CLIPPER / TUBE-TECH
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Linkwitz-Riley 3-band crossover, analog saturation & soft-knee limiter
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBypass('analog_multiband')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                      params.compressorEnabled
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-white/5 text-slate-500 border border-white/5'
                    }`}
                  >
                    {params.compressorEnabled ? 'ACTIVE' : 'BYPASS'}
                  </button>
                  <button
                    onClick={() => handleRemovePlugin('analog_multiband')}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Remove from Rack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Rotary Knobs Grid */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <TactileKnob
                  label="Tape Drive"
                  value={params.tapeWarmthDrive}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={45}
                  accentColor="purple"
                  onChange={(val) => handleParamChange('tapeWarmthDrive', val)}
                />
                <TactileKnob
                  label="Low (350Hz)"
                  value={params.compLowGain}
                  min={-12}
                  max={12}
                  step={0.5}
                  unit="dB"
                  defaultValue={2.5}
                  accentColor="purple"
                  onChange={(val) => handleParamChange('compLowGain', val)}
                />
                <TactileKnob
                  label="Mid (Presence)"
                  value={params.compMidGain}
                  min={-12}
                  max={12}
                  step={0.5}
                  unit="dB"
                  defaultValue={1.0}
                  accentColor="purple"
                  onChange={(val) => handleParamChange('compMidGain', val)}
                />
                <TactileKnob
                  label="High (Air)"
                  value={params.compHighGain}
                  min={-12}
                  max={12}
                  step={0.5}
                  unit="dB"
                  defaultValue={2.0}
                  accentColor="purple"
                  onChange={(val) => handleParamChange('compHighGain', val)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                <button
                  onClick={() => handleParamChange('softClipperEnabled', !params.softClipperEnabled)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-colors ${
                    params.softClipperEnabled
                      ? 'bg-purple-500/15 border-purple-500/40 text-purple-200'
                      : 'bg-white/5 border-white/5 text-slate-400'
                  }`}
                >
                  <span>FL Soft-Clipper Mode:</span>
                  <span className="font-mono font-bold text-purple-300">
                    {params.softClipperEnabled ? 'ON (SLAM 808)' : 'OFF'}
                  </span>
                </button>
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 text-xs">
                  <span className="text-slate-400">Peak Limiter:</span>
                  <span className="font-mono text-emerald-400 font-semibold">{params.compCeilingLimiter} dBFS</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. SPATIAL ACOUSTIC REVERB */}
          {activePlugins.includes('spatial_reverb') && (
            <div className="rounded-2xl bg-slate-950/75 border border-emerald-500/25 p-4 backdrop-blur-xl shadow-xl transition-all">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Waves className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
                        Spatial Acoustic Reverb & M/S Width
                      </h3>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
                        LEXICON 480L
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Schroeder-Moorer matrix diffuser with Mid/Side spatial expansion
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBypass('spatial_reverb')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                      params.reverbEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/5 text-slate-500 border border-white/5'
                    }`}
                  >
                    {params.reverbEnabled ? 'ACTIVE' : 'BYPASS'}
                  </button>
                  <button
                    onClick={() => handleRemovePlugin('spatial_reverb')}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Remove from Rack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Rotary Knobs Grid */}
              <div className="grid grid-cols-4 gap-2">
                <TactileKnob
                  label="Decay"
                  value={params.reverbDecayTime}
                  min={0.2}
                  max={8.0}
                  step={0.1}
                  unit="s"
                  defaultValue={2.0}
                  accentColor="mint"
                  onChange={(val) => handleParamChange('reverbDecayTime', val)}
                />
                <TactileKnob
                  label="Room Size"
                  value={params.reverbRoomSize}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={60}
                  accentColor="mint"
                  onChange={(val) => handleParamChange('reverbRoomSize', val)}
                />
                <TactileKnob
                  label="M/S Width"
                  value={params.stereoWidth}
                  min={0}
                  max={200}
                  step={5}
                  unit="%"
                  defaultValue={125}
                  accentColor="mint"
                  onChange={(val) => handleParamChange('stereoWidth', val)}
                />
                <TactileKnob
                  label="Wet / Dry"
                  value={params.reverbWetDry}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={30}
                  accentColor="mint"
                  onChange={(val) => handleParamChange('reverbWetDry', val)}
                />
              </div>
            </div>
          )}

          {/* 4. SP-404 / 12-BIT VINYL LO-FI DEGRADATION (OLD SCHOOL) */}
          {activePlugins.includes('sp404_lofi') && (
            <div className="rounded-2xl bg-slate-950/75 border border-amber-500/25 p-4 backdrop-blur-xl shadow-xl transition-all">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
                        SP-404 Vinyl & 12-Bit Grime
                      </h3>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/40">
                        ROLAND SP-404 / SP-1200
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Vintage DAC rate decimation, bitcrusher crunch, vinyl crackle & wow/flutter
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBypass('sp404_lofi')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                      params.lofiEnabled
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-white/5 text-slate-500 border border-white/5'
                    }`}
                  >
                    {params.lofiEnabled ? 'ACTIVE' : 'BYPASS'}
                  </button>
                  <button
                    onClick={() => handleRemovePlugin('sp404_lofi')}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Remove from Rack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Rotary Knobs Grid */}
              <div className="grid grid-cols-4 gap-2">
                <TactileKnob
                  label="Bit Depth"
                  value={params.lofiBitDepth}
                  min={8}
                  max={16}
                  step={1}
                  unit="bit"
                  defaultValue={12}
                  accentColor="cyan"
                  onChange={(val) => handleParamChange('lofiBitDepth', val)}
                />
                <TactileKnob
                  label="Sample Drop"
                  value={params.lofiSampleRateReduce}
                  min={1}
                  max={8}
                  step={1}
                  unit="x"
                  defaultValue={2}
                  accentColor="cyan"
                  onChange={(val) => handleParamChange('lofiSampleRateReduce', val)}
                />
                <TactileKnob
                  label="Vinyl Crackle"
                  value={params.lofiVinylCrackle}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={35}
                  accentColor="cyan"
                  onChange={(val) => handleParamChange('lofiVinylCrackle', val)}
                />
                <TactileKnob
                  label="Wow/Flutter"
                  value={params.lofiWowFlutter}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={25}
                  accentColor="cyan"
                  onChange={(val) => handleParamChange('lofiWowFlutter', val)}
                />
              </div>
            </div>
          )}

          {/* 5. DYNAMIC TRANSIENT SHAPER (NEW SCHOOL PUNCH) */}
          {activePlugins.includes('transient_shaper') && (
            <div className="rounded-2xl bg-slate-950/75 border border-emerald-500/25 p-4 backdrop-blur-xl shadow-xl transition-all">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
                        Dynamic Transient Punch Shaper
                      </h3>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
                        SPL TRANSIENT DESIGNER
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Dual-envelope transient shaper for punchy 808s and aggressive drum snap
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBypass('transient_shaper')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                      params.transientEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/5 text-slate-500 border border-white/5'
                    }`}
                  >
                    {params.transientEnabled ? 'ACTIVE' : 'BYPASS'}
                  </button>
                  <button
                    onClick={() => handleRemovePlugin('transient_shaper')}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Remove from Rack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Rotary Knobs Grid */}
              <div className="grid grid-cols-3 gap-2">
                <TactileKnob
                  label="Attack Punch"
                  value={params.transientAttack}
                  min={-100}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={25}
                  accentColor="mint"
                  onChange={(val) => handleParamChange('transientAttack', val)}
                />
                <TactileKnob
                  label="Sustain Ring"
                  value={params.transientSustain}
                  min={-100}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={-15}
                  accentColor="mint"
                  onChange={(val) => handleParamChange('transientSustain', val)}
                />
                <TactileKnob
                  label="Output Gain"
                  value={params.transientOutputGain}
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  unit="x"
                  defaultValue={1.0}
                  accentColor="mint"
                  onChange={(val) => handleParamChange('transientOutputGain', val)}
                />
              </div>
            </div>
          )}

          {/* 6. RHYTHMIC SIDECHAIN PUMPER */}
          {activePlugins.includes('sidechain_pumper') && (
            <div className="rounded-2xl bg-slate-950/75 border border-rose-500/25 p-4 backdrop-blur-xl shadow-xl transition-all">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
                        Rhythmic Sidechain Pumper
                      </h3>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/40">
                        VOLUMESHAPER / LFO TOOL
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Rhythmic exponential ducking envelope for French touch & Jersey club bounce
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBypass('sidechain_pumper')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                      params.sidechainEnabled
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-white/5 text-slate-500 border border-white/5'
                    }`}
                  >
                    {params.sidechainEnabled ? 'ACTIVE' : 'BYPASS'}
                  </button>
                  <button
                    onClick={() => handleRemovePlugin('sidechain_pumper')}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Remove from Rack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Rotary Knobs Grid */}
              <div className="grid grid-cols-2 gap-3">
                <TactileKnob
                  label="Duck Depth"
                  value={params.sidechainDepth}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={70}
                  accentColor="purple"
                  onChange={(val) => handleParamChange('sidechainDepth', val)}
                />
                <TactileKnob
                  label="Release Recovery"
                  value={params.sidechainReleaseMs}
                  min={20}
                  max={400}
                  step={5}
                  unit="ms"
                  defaultValue={120}
                  accentColor="purple"
                  onChange={(val) => handleParamChange('sidechainReleaseMs', val)}
                />
              </div>
            </div>
          )}

          {/* 7. DIMENSION CHORUS & STEREO EXPANDER */}
          {activePlugins.includes('dimension_chorus') && (
            <div className="rounded-2xl bg-slate-950/75 border border-cyan-500/25 p-4 backdrop-blur-xl shadow-xl transition-all">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
                        Dimension Chorus & Stereo Expander
                      </h3>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
                        ROLAND DIMENSION D / JUNO
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Bucket-brigade analog delay lines with dual quadrature LFO spatial widening
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBypass('dimension_chorus')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                      params.chorusEnabled
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-white/5 text-slate-500 border border-white/5'
                    }`}
                  >
                    {params.chorusEnabled ? 'ACTIVE' : 'BYPASS'}
                  </button>
                  <button
                    onClick={() => handleRemovePlugin('dimension_chorus')}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Remove from Rack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Mode Buttons (Dimension D 4-Button selector) */}
              <div className="mb-4 flex items-center gap-2">
                <span className="text-[11px] text-slate-400 whitespace-nowrap">BBD Mode:</span>
                {([1, 2, 3, 4] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleParamChange('chorusDimensionMode', mode)}
                    className={`px-3 py-1 text-[11px] font-mono font-bold rounded-lg transition-colors ${
                      params.chorusDimensionMode === mode
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    MODE {['I', 'II', 'III', 'IV'][mode - 1]}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <TactileKnob
                  label="LFO Rate"
                  value={params.chorusRateHz}
                  min={0.2}
                  max={5.0}
                  step={0.1}
                  unit="Hz"
                  defaultValue={0.8}
                  accentColor="cyan"
                  onChange={(val) => handleParamChange('chorusRateHz', val)}
                />
                <TactileKnob
                  label="Depth"
                  value={params.chorusDepth}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={70}
                  accentColor="cyan"
                  onChange={(val) => handleParamChange('chorusDepth', val)}
                />
                <TactileKnob
                  label="Wet Mix"
                  value={params.chorusMix}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={40}
                  accentColor="cyan"
                  onChange={(val) => handleParamChange('chorusMix', val)}
                />
              </div>
            </div>
          )}

          {/* 8. SPACE ECHO & ANALOG TAPE DELAY */}
          {activePlugins.includes('tape_delay') && (
            <div className="rounded-2xl bg-slate-950/75 border border-amber-500/25 p-4 backdrop-blur-xl shadow-xl transition-all">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
                        Space Echo & Analog Tape Delay
                      </h3>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/40">
                        ROLAND RE-201 / ECHOBOY
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Multi-head magnetic tape simulation with tanh saturated feedback & stereo ping-pong
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBypass('tape_delay')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                      params.delayEnabled
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-white/5 text-slate-500 border border-white/5'
                    }`}
                  >
                    {params.delayEnabled ? 'ACTIVE' : 'BYPASS'}
                  </button>
                  <button
                    onClick={() => handleRemovePlugin('tape_delay')}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Remove from Rack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Ping-Pong Mode Switcher */}
              <div className="mb-4 flex items-center gap-3">
                <button
                  onClick={() => handleParamChange('delayPingPong', !params.delayPingPong)}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                    params.delayPingPong
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  Stereo Ping-Pong: {params.delayPingPong ? 'ENABLED' : 'STANDARD'}
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <TactileKnob
                  label="Delay Time"
                  value={params.delayTimeMs}
                  min={50}
                  max={800}
                  step={10}
                  unit="ms"
                  defaultValue={280}
                  accentColor="amber"
                  onChange={(val) => handleParamChange('delayTimeMs', val)}
                />
                <TactileKnob
                  label="Feedback"
                  value={params.delayFeedback}
                  min={0}
                  max={95}
                  step={1}
                  unit="%"
                  defaultValue={45}
                  accentColor="amber"
                  onChange={(val) => handleParamChange('delayFeedback', val)}
                />
                <TactileKnob
                  label="Tape Sat"
                  value={params.delayTapeWarmth}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={40}
                  accentColor="amber"
                  onChange={(val) => handleParamChange('delayTapeWarmth', val)}
                />
                <TactileKnob
                  label="Mix"
                  value={params.delayMix}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={30}
                  accentColor="amber"
                  onChange={(val) => handleParamChange('delayMix', val)}
                />
              </div>
            </div>
          )}

          {/* 9. SPECTRAL DE-ESSER & 20kHz AIR EQ */}
          {activePlugins.includes('spectral_deesser') && (
            <div className="rounded-2xl bg-slate-950/75 border border-purple-500/25 p-4 backdrop-blur-xl shadow-xl transition-all">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Wind className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
                        Spectral De-Esser & 20kHz Air EQ
                      </h3>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/40">
                        FABFILTER PRO-DS / MÄAG EQ4
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Selective harshness suppression with high-shelf analog air boost
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBypass('spectral_deesser')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                      params.deesserEnabled
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-white/5 text-slate-500 border border-white/5'
                    }`}
                  >
                    {params.deesserEnabled ? 'ACTIVE' : 'BYPASS'}
                  </button>
                  <button
                    onClick={() => handleRemovePlugin('spectral_deesser')}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Remove from Rack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <TactileKnob
                  label="Target Freq"
                  value={params.deessFrequencyHz}
                  min={4000}
                  max={10000}
                  step={100}
                  unit="Hz"
                  defaultValue={6800}
                  accentColor="purple"
                  onChange={(val) => handleParamChange('deessFrequencyHz', val)}
                />
                <TactileKnob
                  label="Threshold"
                  value={params.deessThreshold}
                  min={-40}
                  max={0}
                  step={1}
                  unit="dB"
                  defaultValue={-14}
                  accentColor="purple"
                  onChange={(val) => handleParamChange('deessThreshold', val)}
                />
                <TactileKnob
                  label="Reduction"
                  value={params.deessAmount}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={65}
                  accentColor="purple"
                  onChange={(val) => handleParamChange('deessAmount', val)}
                />
                <TactileKnob
                  label="20kHz Air EQ"
                  value={params.airBandGain}
                  min={0}
                  max={12}
                  step={0.5}
                  unit="dB"
                  defaultValue={3.5}
                  accentColor="cyan"
                  onChange={(val) => handleParamChange('airBandGain', val)}
                />
              </div>
            </div>
          )}

          {/* 10. OTT HYPER-COMPRESSOR */}
          {activePlugins.includes('hyper_ott') && (
            <div className="rounded-2xl bg-slate-950/75 border border-rose-500/25 p-4 backdrop-blur-xl shadow-xl transition-all">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
                        OTT Upward/Downward Hyper-Compressor
                      </h3>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/40">
                        XFER OTT / ABLETON MULTIBAND
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Aggressive upward expansion on buried ambience + downward transient slam
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBypass('hyper_ott')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                      params.ottEnabled
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-white/5 text-slate-500 border border-white/5'
                    }`}
                  >
                    {params.ottEnabled ? 'ACTIVE' : 'BYPASS'}
                  </button>
                  <button
                    onClick={() => handleRemovePlugin('hyper_ott')}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Remove from Rack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <TactileKnob
                  label="OTT Depth"
                  value={params.ottDepth}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={50}
                  accentColor="purple"
                  onChange={(val) => handleParamChange('ottDepth', val)}
                />
                <TactileKnob
                  label="Upward Gain"
                  value={params.ottUpwardGain}
                  min={0}
                  max={18}
                  step={0.5}
                  unit="dB"
                  defaultValue={6.0}
                  accentColor="cyan"
                  onChange={(val) => handleParamChange('ottUpwardGain', val)}
                />
                <TactileKnob
                  label="Down Thresh"
                  value={params.ottDownwardThreshold}
                  min={-30}
                  max={0}
                  step={1}
                  unit="dB"
                  defaultValue={-8}
                  accentColor="amber"
                  onChange={(val) => handleParamChange('ottDownwardThreshold', val)}
                />
                <TactileKnob
                  label="Time Scale"
                  value={params.ottTimeScale}
                  min={50}
                  max={200}
                  step={5}
                  unit="%"
                  defaultValue={100}
                  accentColor="purple"
                  onChange={(val) => handleParamChange('ottTimeScale', val)}
                />
              </div>
            </div>
          )}

          {/* 11. 1970s PULTEC EQP-1A TUBE PROGRAM EQ */}
          {activePlugins.includes('pultec_eq') && (
            <div className="rounded-3xl bg-slate-900/80 border border-amber-500/20 p-4 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
                        Pultec EQP-1A Tube Program EQ
                      </h3>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/40">
                        1970s ANALOG TUBE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Iconic Pultec simultaneous Low Boost & Attenuation resonant low-end trick
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBypass('pultec_eq')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                      params.pultecEnabled
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-white/5 text-slate-500 border border-white/5'
                    }`}
                  >
                    {params.pultecEnabled ? 'ACTIVE' : 'BYPASS'}
                  </button>
                  <button
                    onClick={() => handleRemovePlugin('pultec_eq')}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Remove from Rack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <TactileKnob
                  label="Low Freq"
                  value={params.pultecLowFreq}
                  min={20}
                  max={100}
                  step={10}
                  unit="Hz"
                  defaultValue={60}
                  accentColor="amber"
                  onChange={(val) => handleParamChange('pultecLowFreq', val as 30 | 60 | 100)}
                />
                <TactileKnob
                  label="Low Boost"
                  value={params.pultecBoost}
                  min={0}
                  max={10}
                  step={0.5}
                  unit="dB"
                  defaultValue={5.0}
                  accentColor="amber"
                  onChange={(val) => handleParamChange('pultecBoost', val)}
                />
                <TactileKnob
                  label="Low Atten"
                  value={params.pultecAtten}
                  min={0}
                  max={10}
                  step={0.5}
                  unit="dB"
                  defaultValue={4.0}
                  accentColor="purple"
                  onChange={(val) => handleParamChange('pultecAtten', val)}
                />
                <TactileKnob
                  label="High Boost"
                  value={params.pultecHighBoost}
                  min={0}
                  max={10}
                  step={0.5}
                  unit="dB"
                  defaultValue={3.5}
                  accentColor="cyan"
                  onChange={(val) => handleParamChange('pultecHighBoost', val)}
                />
              </div>
            </div>
          )}

          {/* 12. 1980s SSL 4000 G-BUS CONSOLE COMPRESSOR */}
          {activePlugins.includes('ssl_bus_comp') && (
            <div className="rounded-3xl bg-slate-900/80 border border-purple-500/20 p-4 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
                        SSL 4000 G-Bus Master Compressor
                      </h3>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/40">
                        1980s BRITISH GLUE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      The legendary London master console glue compressor with auto-release
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBypass('ssl_bus_comp')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                      params.sslCompEnabled
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-white/5 text-slate-500 border border-white/5'
                    }`}
                  >
                    {params.sslCompEnabled ? 'ACTIVE' : 'BYPASS'}
                  </button>
                  <button
                    onClick={() => handleRemovePlugin('ssl_bus_comp')}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Remove from Rack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <TactileKnob
                  label="Threshold"
                  value={params.sslThreshold}
                  min={-30}
                  max={10}
                  step={1}
                  unit="dB"
                  defaultValue={-12}
                  accentColor="purple"
                  onChange={(val) => handleParamChange('sslThreshold', val)}
                />
                <TactileKnob
                  label="Ratio"
                  value={params.sslRatio}
                  min={2}
                  max={10}
                  step={2}
                  unit=":1"
                  defaultValue={4}
                  accentColor="purple"
                  onChange={(val) => handleParamChange('sslRatio', val as 2 | 4 | 10)}
                />
                <TactileKnob
                  label="Attack"
                  value={params.sslAttackMs}
                  min={0.1}
                  max={30}
                  step={0.5}
                  unit="ms"
                  defaultValue={3.0}
                  accentColor="cyan"
                  onChange={(val) => handleParamChange('sslAttackMs', val)}
                />
                <TactileKnob
                  label="Make-Up"
                  value={params.sslMakeUpGain}
                  min={0}
                  max={12}
                  step={0.5}
                  unit="dB"
                  defaultValue={3.0}
                  accentColor="amber"
                  onChange={(val) => handleParamChange('sslMakeUpGain', val)}
                />
              </div>
            </div>
          )}

          {/* 13. 1990s ENSONIQ ASR-10 RESAMPLING SAMPLER GRIT */}
          {activePlugins.includes('asr10_sampler_grit') && (
            <div className="rounded-3xl bg-slate-900/80 border border-amber-500/20 p-4 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
                        Ensoniq ASR-10 Sampler Grit
                      </h3>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/40">
                        1990s GOLDEN ERA
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      RZA & Kanye signature 14-bit converter color & variable resample crunch
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBypass('asr10_sampler_grit')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                      params.asrEnabled
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-white/5 text-slate-500 border border-white/5'
                    }`}
                  >
                    {params.asrEnabled ? 'ACTIVE' : 'BYPASS'}
                  </button>
                  <button
                    onClick={() => handleRemovePlugin('asr10_sampler_grit')}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Remove from Rack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <TactileKnob
                  label="Bit Depth"
                  value={params.asrBitDepth}
                  min={8}
                  max={16}
                  step={1}
                  unit="bit"
                  defaultValue={14}
                  accentColor="amber"
                  onChange={(val) => handleParamChange('asrBitDepth', val as 12 | 14 | 16)}
                />
                <TactileKnob
                  label="Resample Rate"
                  value={params.asrResampleFreq}
                  min={12000}
                  max={44100}
                  step={1000}
                  unit="Hz"
                  defaultValue={32000}
                  accentColor="cyan"
                  onChange={(val) => handleParamChange('asrResampleFreq', val)}
                />
                <TactileKnob
                  label="Analog Warmth"
                  value={params.asrAnalogWarmth}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={50}
                  accentColor="amber"
                  onChange={(val) => handleParamChange('asrAnalogWarmth', val)}
                />
              </div>
            </div>
          )}

          {/* 14. 2010s PENTODE TUBE HEAT SATURATOR */}
          {activePlugins.includes('tube_heat') && (
            <div className="rounded-3xl bg-slate-900/80 border border-rose-500/20 p-4 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <Disc3 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
                        Pentode Tube Heat Saturator
                      </h3>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/40">
                        2010s ATLANTA TRAP
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Asymmetric tube drive, grid bias & harmonic fatness for hard-hitting 808s
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBypass('tube_heat')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                      params.tubeHeatEnabled
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-white/5 text-slate-500 border border-white/5'
                    }`}
                  >
                    {params.tubeHeatEnabled ? 'ACTIVE' : 'BYPASS'}
                  </button>
                  <button
                    onClick={() => handleRemovePlugin('tube_heat')}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Remove from Rack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <TactileKnob
                  label="Tube Drive"
                  value={params.tubeDrive}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={40}
                  accentColor="amber"
                  onChange={(val) => handleParamChange('tubeDrive', val)}
                />
                <TactileKnob
                  label="Grid Bias"
                  value={params.tubeBias}
                  min={0}
                  max={50}
                  step={1}
                  unit="%"
                  defaultValue={15}
                  accentColor="amber"
                  onChange={(val) => handleParamChange('tubeBias', val)}
                />
                <TactileKnob
                  label="Sub Fatness"
                  value={params.tubeFatness}
                  min={0}
                  max={6}
                  step={0.5}
                  unit="dB"
                  defaultValue={3.0}
                  accentColor="purple"
                  onChange={(val) => handleParamChange('tubeFatness', val)}
                />
              </div>
            </div>
          )}

          {/* 15. 2020s DYNAMIC RESONANCE SUPPRESSOR */}
          {activePlugins.includes('resonance_suppressor') && (
            <div className="rounded-3xl bg-slate-900/80 border border-cyan-500/20 p-4 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
                        Dynamic Resonance Suppressor
                      </h3>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
                        2020s SOOTHE2 TECH
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Automatic real-time harsh resonance detection and selective notch suppression
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBypass('resonance_suppressor')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                      params.sootheEnabled
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-white/5 text-slate-500 border border-white/5'
                    }`}
                  >
                    {params.sootheEnabled ? 'ACTIVE' : 'BYPASS'}
                  </button>
                  <button
                    onClick={() => handleRemovePlugin('resonance_suppressor')}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Remove from Rack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <TactileKnob
                  label="Suppr. Depth"
                  value={params.sootheDepth}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={55}
                  accentColor="cyan"
                  onChange={(val) => handleParamChange('sootheDepth', val)}
                />
                <TactileKnob
                  label="Sharpness Q"
                  value={params.sootheSharpness}
                  min={1}
                  max={6}
                  step={0.5}
                  unit="Q"
                  defaultValue={2.5}
                  accentColor="purple"
                  onChange={(val) => handleParamChange('sootheSharpness', val)}
                />
                <div className="flex flex-col justify-center items-center bg-slate-950/60 rounded-2xl p-2 border border-white/5">
                  <span className="text-[10px] font-mono text-slate-400 mb-1.5">TARGET BAND</span>
                  <select
                    value={params.sootheTargetBand}
                    onChange={(e) => handleParamChange('sootheTargetBand', e.target.value as any)}
                    className="bg-slate-900 text-xs font-mono text-cyan-300 border border-cyan-500/30 rounded-lg px-2 py-1 focus:outline-none w-full text-center"
                  >
                    <option value="high_harsh">High Sibilance (4k-10k)</option>
                    <option value="mid_box">Mid Boxiness (500-1.5k)</option>
                    <option value="low_mud">Low Mud (200-400)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MASTER GAIN BAR */}
      <div className="rounded-2xl bg-slate-950/85 border border-white/10 p-3.5 backdrop-blur-xl flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-300">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200">Master Lossless Bus</div>
            <div className="text-[11px] text-slate-400">Zero-clip 64-bit float brickwall ceiling</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <TactileKnob
            label="Master Gain"
            value={params.masterGain}
            min={0}
            max={120}
            step={1}
            unit="%"
            defaultValue={95}
            size="sm"
            accentColor="cyan"
            onChange={(val) => handleParamChange('masterGain', val)}
          />
        </div>
      </div>

      {/* MODAL: PLUGIN BOUTIQUE DRAWER (CLEAN UI PLUGINS SPOT) */}
      {isCatalogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-slate-950 border border-white/10 p-5 shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Plugin Boutique Catalog</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Select and activate hardware-modeled DSP plugins into your rack
                </p>
              </div>
              <button
                onClick={() => setIsCatalogOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {PLUGIN_CATALOG.map((item) => {
                const isAlreadyInRack = activePlugins.includes(item.type);

                return (
                  <div
                    key={item.type}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      isAlreadyInRack
                        ? 'bg-cyan-500/10 border-cyan-500/40'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="pr-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-100">{item.name}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-cyan-300">
                          {item.category}
                        </span>
                        {item.era === 'old_school' && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/40">
                            OLD SCHOOL
                          </span>
                        )}
                        {item.era === 'new_school' && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/40">
                            NEW SCHOOL
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-1.5">
                        {item.description}
                      </p>
                      <div className="text-[10px] font-mono text-slate-500">
                        Inspiration: <span className="text-slate-300">{item.hardwareInspiration}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (isAlreadyInRack) {
                          handleRemovePlugin(item.type);
                        } else {
                          handleActivatePlugin(item.type);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all ${
                        isAlreadyInRack
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500 hover:text-white'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
                      }`}
                    >
                      {isAlreadyInRack ? 'Remove' : '+ Activate'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
