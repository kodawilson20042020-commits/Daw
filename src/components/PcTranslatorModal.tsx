/**
 * AURA DSP - PC-to-Mobile Parameter Translation Modal
 * Maps desktop DAW configurations (FL Studio, Ableton, Logic) directly to mobile DSP.
 */

import React, { useState } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import { BUILTIN_PC_PRESETS, DESKTOP_MAPPING_MATRIX, parseDesktopPresetJson } from '../audio/pcTranslator';
import { PcPresetTranslation } from '../types/audio';
import { Sparkles, Layers, ArrowRight, Download, Upload, Check, X } from 'lucide-react';

interface PcTranslatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset: () => void;
}

export const PcTranslatorModal: React.FC<PcTranslatorModalProps> = ({
  isOpen,
  onClose,
  onApplyPreset
}) => {
  const engine = AudioEngine.getInstance();
  const [selectedPresetId, setSelectedPresetId] = useState<string>(BUILTIN_PC_PRESETS[0].id);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [activeTab, setActiveTab] = useState<'presets' | 'matrix' | 'custom'>('presets');

  if (!isOpen) return null;

  const currentPreset = BUILTIN_PC_PRESETS.find((p) => p.id === selectedPresetId) || BUILTIN_PC_PRESETS[0];

  const handleApplyPreset = (preset: PcPresetTranslation) => {
    // Apply FX parameters
    for (const [k, v] of Object.entries(preset.parameters)) {
      if (v !== undefined) {
        engine.updateParam(k as any, v as any);
      }
    }
    // Apply groove if present
    if (preset.groove) {
      if (preset.groove.tempoBpm) engine.grooveSettings.tempoBpm = preset.groove.tempoBpm;
      if (preset.groove.swingPercent) engine.grooveSettings.swingPercent = preset.groove.swingPercent;
      if (preset.groove.humanizeMs) engine.grooveSettings.humanizeMs = preset.groove.humanizeMs;
    }

    engine.applyAllParams();
    setAppliedNotification(`Applied "${preset.name}" into Mobile DSP!`);
    onApplyPreset();
    setTimeout(() => setAppliedNotification(null), 2500);
  };

  const handleImportCustom = () => {
    const parsed = parseDesktopPresetJson(importText);
    if (!parsed) {
      alert('Invalid JSON preset format. Please ensure valid parameter key-values.');
      return;
    }
    for (const [k, v] of Object.entries(parsed)) {
      if (v !== undefined) {
        engine.updateParam(k as any, v as any);
      }
    }
    engine.applyAllParams();
    setAppliedNotification('Custom JSON preset successfully translated into Mobile DSP!');
    onApplyPreset();
    setTimeout(() => setAppliedNotification(null), 2500);
  };

  const handleExportActiveConfig = () => {
    const jsonStr = JSON.stringify(engine.currentParams, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AURA_DSP_Preset_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-slate-950 border border-white/10 p-5 shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
        {/* Glow ambient */}
        <div className="absolute top-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 tracking-tight">
                PC-to-Mobile Parameter Translator
              </h2>
              <p className="text-xs text-slate-400">
                Desktop DAW Preset Ingestion (FL Studio / Ableton / Logic)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Tab Bar */}
        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl mb-4 shrink-0">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'presets'
                ? 'bg-purple-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Studio Presets
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'matrix'
                ? 'bg-purple-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Translation Matrix
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'custom'
                ? 'bg-purple-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            JSON Ingest / Export
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {appliedNotification && (
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{appliedNotification}</span>
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="space-y-3">
              <div className="space-y-2">
                {BUILTIN_PC_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      selectedPresetId === preset.id
                        ? 'bg-purple-500/15 border-purple-500/50 shadow-lg shadow-purple-500/10'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-bold text-slate-100">{preset.name}</div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/40">
                        {preset.dawSource}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                      {preset.description}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {preset.desktopPlugins.map((plug, idx) => (
                        <span key={idx} className="text-[9px] font-mono bg-white/5 text-slate-300 px-1.5 py-0.5 rounded">
                          {plug}
                        </span>
                      ))}
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyPreset(preset);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-purple-500/20"
                      >
                        <span>Translate to Mobile DSP</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'matrix' && (
            <div className="space-y-2">
              <div className="text-xs text-slate-400 mb-2">
                Mathematical mapping matrix transforming heavy desktop VST floating-point algorithms into AURA Mobile AudioWorklet parameters:
              </div>
              <div className="space-y-2">
                {DESKTOP_MAPPING_MATRIX.map((entry, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1 text-xs">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-purple-300 font-semibold">{entry.desktopPlugin}</span>
                      <span className="text-slate-500">→ {entry.auraParam}</span>
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Desktop Param: <span className="text-slate-200">{entry.desktopParam}</span> ({entry.desktopRange})
                    </div>
                    <div className="text-[10px] font-mono text-cyan-400 bg-black/40 p-1.5 rounded">
                      Formula: {entry.formula}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Paste raw JSON from desktop script exporter or export current live rack state:
              </div>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='{\n  "vocalTuneSpeed": 95,\n  "tapeWarmthDrive": 70,\n  "reverbDecayTime": 3.2\n}'
                rows={6}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs font-mono text-cyan-300 focus:outline-none focus:border-purple-500 resize-none"
              />

              <div className="flex items-center gap-2">
                <button
                  onClick={handleImportCustom}
                  disabled={!importText.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Translate & Ingest JSON</span>
                </button>

                <button
                  onClick={handleExportActiveConfig}
                  className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-white/10"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Export Rack JSON</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
