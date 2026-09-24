/**
 * AURA DSP - Persistent Quick Export Modal
 * Rapid offline rendering & lossless WAV stem export (Master, Vocals, Instrumental)
 * Outputs uncompressed 24-bit or 16-bit 48kHz audio.
 */

import React, { useState } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import { downloadBlob } from '../audio/wavEncoder';
import { Download, CheckCircle2, Loader2, X, FileAudio, Disc, Github, FolderDown } from 'lucide-react';

interface QuickExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickExportModal: React.FC<QuickExportModalProps> = ({ isOpen, onClose }) => {
  const engine = AudioEngine.getInstance();
  const [stemChoice, setStemChoice] = useState<'master' | 'vocals' | 'instrumental'>('master');
  const [bitDepth, setBitDepth] = useState<16 | 24>(24);
  const [duration, setDuration] = useState<number>(8); // 8s loop
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [lastExportedBlob, setLastExportedBlob] = useState<{ blob: Blob; filename: string } | null>(null);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsRendering(true);
    setRenderProgress(10);
    setLastExportedBlob(null);

    // Simulated progress tick during offline context render
    const progressTimer = setInterval(() => {
      setRenderProgress((p) => (p < 85 ? p + 25 : p));
    }, 120);

    try {
      const result = await engine.renderLosslessExport(stemChoice, duration, bitDepth);
      clearInterval(progressTimer);
      setRenderProgress(100);
      setLastExportedBlob(result);
      // Automatically trigger download
      downloadBlob(result.blob, result.filename);
    } catch (err) {
      console.error('Offline export error:', err);
    } finally {
      setIsRendering(false);
    }
  };

  const estimatedSizeMb = ((48000 * 2 * (bitDepth / 8) * duration) / (1024 * 1024)).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-slate-950 border border-white/10 p-5 shadow-2xl relative overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 tracking-tight">
                Lossless Studio Quick Export
              </h2>
              <p className="text-xs text-slate-400">
                Offline non-blocking render with full AudioWorklet DSP
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

        {/* Stem Target Selector */}
        <div className="space-y-3 mb-4">
          <label className="text-xs font-semibold text-slate-300">Target Stem Selection:</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'master', label: 'Master Mix', sub: 'Vocals + Beat' },
              { id: 'vocals', label: 'Vocal Stem', sub: 'Tuned & Shaped' },
              { id: 'instrumental', label: 'Instrumental', sub: 'Beat + Bass' }
            ].map((stem) => (
              <button
                key={stem.id}
                onClick={() => setStemChoice(stem.id as any)}
                className={`p-2.5 rounded-xl text-left border transition-all ${
                  stemChoice === stem.id
                    ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200 shadow-md shadow-cyan-500/10'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <div className="text-xs font-semibold">{stem.label}</div>
                <div className="text-[10px] text-slate-500">{stem.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Format & Bit Depth */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Bit Depth:</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[24, 16].map((depth) => (
                <button
                  key={depth}
                  onClick={() => setBitDepth(depth as any)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    bitDepth === depth
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                      : 'bg-white/5 border-white/5 text-slate-400'
                  }`}
                >
                  {depth}-bit PCM
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Render Length:</label>
            <div className="grid grid-cols-3 gap-1">
              {[4, 8, 16].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setDuration(sec)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    duration === sec
                      ? 'bg-purple-500 text-slate-950 border-purple-400 font-bold'
                      : 'bg-white/5 border-white/5 text-slate-400'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Spec Metadata Card */}
        <div className="rounded-xl bg-slate-900/80 border border-white/5 p-3 mb-5 text-xs font-mono space-y-1 text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-500">Sample Rate:</span>
            <span className="text-slate-200">48,000 Hz (Lossless Studio)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Audio Channels:</span>
            <span className="text-slate-200">2 (Interleaved Stereo)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Estimated Size:</span>
            <span className="text-cyan-400 font-semibold">{estimatedSizeMb} MB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Codec:</span>
            <span className="text-slate-200">Uncompressed RIFF WAV</span>
          </div>
        </div>

        {/* Render Progress Bar */}
        {isRendering && (
          <div className="mb-4 space-y-1.5">
            <div className="flex justify-between text-xs font-mono text-cyan-300">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                DSP Rendering Offline...
              </span>
              <span>{renderProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 transition-all duration-150"
                style={{ width: `${renderProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success message */}
        {lastExportedBlob && !isRendering && (
          <div className="mb-4 p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-800/40 text-emerald-300 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Lossless WAV Rendered & Saved!</span>
            </span>
            <button
              onClick={() => downloadBlob(lastExportedBlob.blob, lastExportedBlob.filename)}
              className="underline text-[11px] font-semibold"
            >
              Re-download
            </button>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleStartExport}
          disabled={isRendering}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
        >
          {isRendering ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Rendering Lossless Stem...</span>
            </>
          ) : (
            <>
              <FileAudio className="w-4 h-4" />
              <span>Render & Download Lossless WAV</span>
            </>
          )}
        </button>

        {/* Source Code & GitHub Archive */}
        <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Github className="w-4 h-4 text-purple-400" />
              <span>Full Project Codebase</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Git Initialized (main)</span>
          </div>

          <a
            href="/api/download-source"
            download="aura-dsp-companion.zip"
            className="w-full h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:border-purple-500/40"
          >
            <FolderDown className="w-4 h-4 text-purple-400" />
            <span>Download Source Archive (ZIP • 204KB)</span>
          </a>

          <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
            Contains all 43 TypeScript/React source files, AudioWorklet DSP engines, and README.md. To push to your GitHub:
            <code className="block mt-1 p-1.5 rounded bg-black/60 text-slate-400 text-[9px] select-all">
              git remote add origin https://github.com/&lt;user&gt;/&lt;repo&gt;.git &amp;&amp; git push -u origin main
            </code>
          </p>
        </div>
      </div>
    </div>
  );
};
