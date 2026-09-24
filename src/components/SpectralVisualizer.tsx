/**
 * AURA DSP - Spectral Telemetry & Phase Scope Visualizer
 * Renders 60fps real-time FFT spectrum, stereo phase goniometer, and peak VU meters.
 * Driven directly by SharedArrayBuffer or low-latency AudioWorklet port bridge.
 */

import React, { useRef, useEffect, useState } from 'react';
import { VisualizerData } from '../types/audio';
import { AudioEngine } from '../audio/AudioEngine';

export const SpectralVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<VisualizerData>({
    spectrum: new Float32Array(32),
    timeDomain: new Float32Array(128),
    peakL: 0,
    peakR: 0,
    correlation: 1.0,
    isSharedArrayBufferActive: false
  });

  useEffect(() => {
    const engine = AudioEngine.getInstance();
    const unsubscribe = engine.subscribeVisualizer((newData) => {
      setData({ ...newData });
    });
    return () => unsubscribe();
  }, []);

  // 60 FPS Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Dark glass background clear
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(0, 0, width, height);

      // Subtle horizontal dB reference grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let y = 10; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw FFT Frequency Spectrum Bars (left 70% of canvas)
      const spectrumWidth = width * 0.72;
      const barCount = 32;
      const barSpacing = 2;
      const totalSpacing = barSpacing * (barCount - 1);
      const barWidth = Math.max(2, (spectrumWidth - totalSpacing) / barCount);

      for (let i = 0; i < barCount; i++) {
        const val = Math.min(1.0, data.spectrum[i] * 2.2 || 0);
        const barHeight = Math.max(3, val * (height - 12));
        const x = i * (barWidth + barSpacing);
        const y = height - barHeight - 4;

        // Gradient color: Cyan at bottom, purple in middle, bright mint at peaks
        const barGrad = ctx.createLinearGradient(0, height, 0, y);
        barGrad.addColorStop(0, '#0284c7');
        barGrad.addColorStop(0.6, '#06b6d4');
        barGrad.addColorStop(0.9, '#a855f7');
        barGrad.addColorStop(1.0, '#34d399');

        ctx.fillStyle = barGrad;
        // Rounded top bars
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
        ctx.fill();

        // Subtle glow peak cap
        if (val > 0.05) {
          ctx.fillStyle = val > 0.85 ? '#f43f5e' : '#67e8f9';
          ctx.fillRect(x, Math.max(2, y - 2), barWidth, 1.5);
        }
      }

      // Draw Oscilloscope / Waveform overlay
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const wavePoints = data.timeDomain.length;
      for (let i = 0; i < wavePoints; i++) {
        const wx = (i / (wavePoints - 1)) * spectrumWidth;
        const wy = height * 0.5 + data.timeDomain[i] * height * 0.38;
        if (i === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.stroke();

      // Draw Stereo Phase Scope / Lissajous Goniometer (right 28% of canvas)
      const goniometerCenterX = spectrumWidth + (width - spectrumWidth) / 2;
      const goniometerCenterY = height / 2;
      const goniometerRadius = Math.min(26, height * 0.38);

      // Circle bounds
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(goniometerCenterX, goniometerCenterY, goniometerRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Center crosshairs
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(goniometerCenterX - goniometerRadius, goniometerCenterY);
      ctx.lineTo(goniometerCenterX + goniometerRadius, goniometerCenterY);
      ctx.moveTo(goniometerCenterX, goniometerCenterY - goniometerRadius);
      ctx.lineTo(goniometerCenterX, goniometerCenterY + goniometerRadius);
      ctx.stroke();

      // Correlation needle
      const corrAngle = ((data.correlation || 1.0) * Math.PI) / 4; // -45 to +45 deg
      ctx.strokeStyle = data.correlation < 0 ? '#f43f5e' : '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(goniometerCenterX, goniometerCenterY);
      ctx.lineTo(
        goniometerCenterX + Math.sin(corrAngle) * goniometerRadius,
        goniometerCenterY - Math.cos(corrAngle) * goniometerRadius
      );
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [data]);

  const peakDbL = Math.max(-48, Math.round(20 * Math.log10(Math.max(0.0001, data.peakL))));
  const peakDbR = Math.max(-48, Math.round(20 * Math.log10(Math.max(0.0001, data.peakR))));

  return (
    <div className="relative rounded-2xl bg-slate-950/80 border border-white/10 p-3 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden">
      {/* Top telemetry bar */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-semibold text-slate-200">REAL-TIME DSP SPECTRAL ENGINE</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">48kHz / 32-Band FFT</span>
        </div>

        <div className="flex items-center gap-2">
          {data.isSharedArrayBufferActive ? (
            <span className="text-emerald-400 font-medium bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded text-[9px]">
              SHARED ARRAY BUFFER (ZERO-COPY)
            </span>
          ) : (
            <span className="text-cyan-400 font-medium bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.5 rounded text-[9px]">
              MESSAGE-PORT THREAD PIPE
            </span>
          )}
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="relative w-full h-24 rounded-xl overflow-hidden bg-[#0a0e17] border border-white/5">
        <canvas
          ref={canvasRef}
          width={640}
          height={96}
          className="w-full h-full block"
        />

        {/* Phase Scope Label Overlay */}
        <div className="absolute right-3 bottom-1.5 text-[9px] font-mono text-slate-400 pointer-events-none text-right">
          <span>PHASE: </span>
          <span className={`font-semibold ${data.correlation < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {data.correlation > 0 ? '+' : ''}
            {data.correlation.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Bottom Metering Row */}
      <div className="mt-2 grid grid-cols-2 gap-3 items-center">
        {/* Left Channel VU */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400 w-3">L</span>
          <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              className="h-full rounded-full transition-all duration-75"
              style={{
                width: `${Math.min(100, Math.max(0, data.peakL * 100))}%`,
                background: data.peakL > 0.95 ? '#f43f5e' : 'linear-gradient(90deg, #06b6d4, #10b981)'
              }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-300 w-11 text-right tabular-nums">
            {peakDbL <= -48 ? '-inf' : `${peakDbL} dB`}
          </span>
        </div>

        {/* Right Channel VU */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400 w-3">R</span>
          <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              className="h-full rounded-full transition-all duration-75"
              style={{
                width: `${Math.min(100, Math.max(0, data.peakR * 100))}%`,
                background: data.peakR > 0.95 ? '#f43f5e' : 'linear-gradient(90deg, #06b6d4, #10b981)'
              }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-300 w-11 text-right tabular-nums">
            {peakDbR <= -48 ? '-inf' : `${peakDbR} dB`}
          </span>
        </div>
      </div>
    </div>
  );
};
