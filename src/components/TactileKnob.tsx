/**
 * AURA DSP - Tactile Liquid Glass Rotary Knob
 * High-precision touch & drag interaction with responsive SVG progress arc,
 * double-click reset, mouse wheel support, and luminous neon feedback.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';

interface TactileKnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  defaultValue?: number;
  accentColor?: 'cyan' | 'purple' | 'mint' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  onChange: (value: number) => void;
}

export const TactileKnob: React.FC<TactileKnobProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  defaultValue,
  accentColor = 'cyan',
  size = 'md',
  onChange
}) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartVal = useRef(0);

  const radiusMap = { sm: 26, md: 34, lg: 42 };
  const strokeMap = { sm: 3, md: 4, lg: 5 };
  const r = radiusMap[size];
  const stroke = strokeMap[size];
  const center = r + stroke + 4;
  const svgSize = center * 2;

  // Normalized 0..1
  const norm = Math.max(0, Math.min(1, (value - min) / (max - min)));

  // Rotary angle: -135deg (min) to +135deg (max) -> 270 degree total sweep
  const startAngle = 135;
  const sweepAngle = 270;
  const currentAngle = startAngle + norm * sweepAngle;

  // Arc math for SVG path
  const polarToCartesian = (cx: number, cy: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + radius * Math.cos(angleInRadians),
      y: cy + radius * Math.sin(angleInRadians)
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAng: number, endAng: number) => {
    const start = polarToCartesian(x, y, radius, endAng);
    const end = polarToCartesian(x, y, radius, startAng);
    const largeArcFlag = endAng - startAng <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  const bgArc = describeArc(center, center, r, 135, 135 + 270);
  const valArc = norm > 0.005 ? describeArc(center, center, r, 135, 135 + norm * 270) : '';

  const colorStyles = {
    cyan: {
      glow: 'rgba(6, 182, 212, 0.4)',
      stroke: '#06b6d4',
      gradientStart: '#22d3ee',
      gradientEnd: '#0891b2',
      indicator: '#38bdf8'
    },
    purple: {
      glow: 'rgba(168, 85, 247, 0.4)',
      stroke: '#a855f7',
      gradientStart: '#c084fc',
      gradientEnd: '#7e22ce',
      indicator: '#c084fc'
    },
    mint: {
      glow: 'rgba(16, 185, 129, 0.4)',
      stroke: '#10b981',
      gradientStart: '#34d399',
      gradientEnd: '#059669',
      indicator: '#34d399'
    },
    amber: {
      glow: 'rgba(245, 158, 11, 0.4)',
      stroke: '#f59e0b',
      gradientStart: '#fbbf24',
      gradientEnd: '#d97706',
      indicator: '#fbbf24'
    }
  }[accentColor];

  // Drag interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartVal.current = value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaY = dragStartY.current - e.clientY; // upward drag increases
    const sensitivity = (max - min) / 160; // 160px drag from min to max
    let newVal = dragStartVal.current + deltaY * sensitivity;

    if (step >= 1) {
      newVal = Math.round(newVal / step) * step;
    } else {
      const decimals = step.toString().split('.')[1]?.length || 1;
      newVal = Number(newVal.toFixed(decimals));
    }

    newVal = Math.max(min, Math.min(max, newVal));
    onChange(newVal);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    const stepSize = step || (max - min) / 100;
    let newVal = value + dir * stepSize;
    newVal = Math.max(min, Math.min(max, newVal));
    if (step >= 1) newVal = Math.round(newVal);
    onChange(newVal);
  };

  const handleDoubleClick = () => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    }
  };

  // Pointer position inside knob for indicator dot
  const dotPos = polarToCartesian(center, center, r - 9, currentAngle);

  return (
    <div className="flex flex-col items-center select-none group touch-none">
      <div
        ref={knobRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        title="Drag up/down to adjust, double-click to reset"
        className={`relative flex items-center justify-center cursor-ns-resize transition-transform duration-100 ${
          isDragging ? 'scale-105' : 'hover:scale-[1.02]'
        }`}
        style={{ width: svgSize, height: svgSize }}
      >
        {/* SVG Dial Arc */}
        <svg width={svgSize} height={svgSize} className="overflow-visible">
          <defs>
            <filter id={`glow-${accentColor}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={colorStyles.stroke} floodOpacity="0.6" />
            </filter>
            <linearGradient id={`grad-${accentColor}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colorStyles.gradientStart} />
              <stop offset="100%" stopColor={colorStyles.gradientEnd} />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <path
            d={bgArc}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={stroke}
            strokeLinecap="round"
          />

          {/* Active Value Arc */}
          {valArc && (
            <path
              d={valArc}
              fill="none"
              stroke={`url(#grad-${accentColor})`}
              strokeWidth={stroke + (isDragging ? 1 : 0)}
              strokeLinecap="round"
              filter={`url(#glow-${accentColor})`}
            />
          )}

          {/* Inner Liquid Glass Knob Body */}
          <circle
            cx={center}
            cy={center}
            r={r - stroke - 3}
            fill="url(#glass-gradient)"
            className="fill-slate-900/90 stroke-white/10"
            strokeWidth="1.5"
            style={{
              filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.6))'
            }}
          />

          {/* Inner Bezel Ring */}
          <circle
            cx={center}
            cy={center}
            r={r - stroke - 7}
            fill="none"
            stroke="rgba(255, 255, 255, 0.04)"
            strokeWidth="1"
          />

          {/* Position Dot Indicator */}
          <circle
            cx={dotPos.x}
            cy={dotPos.y}
            r={size === 'sm' ? 2 : 2.5}
            fill={colorStyles.indicator}
            style={{
              filter: `drop-shadow(0 0 4px ${colorStyles.stroke})`
            }}
          />
        </svg>

        {/* Center Glow Ambient */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at center, ${colorStyles.glow} 0%, transparent 70%)`,
            opacity: isDragging ? 0.8 : 0.2
          }}
        />
      </div>

      {/* Label & Value Display */}
      <div className="mt-1 text-center">
        <div className="text-[11px] font-medium text-slate-400 tracking-tight whitespace-nowrap">
          {label}
        </div>
        <div className="text-[12px] font-semibold text-slate-100 font-mono tabular-nums tracking-tight">
          {typeof value === 'number' && step < 1 ? value.toFixed(1) : value}
          <span className="text-[10px] text-slate-400 ml-0.5">{unit}</span>
        </div>
      </div>
    </div>
  );
};
