# AURA DSP Mobile Companion
## Professional Mobile Audio Workstation & DSP Engineering Suite

---

## 1. Executive Overview

**AURA DSP Mobile Companion** is a high-performance, zero-allocation digital audio workstation (DAW) and acoustics laboratory engineered for mobile and web environments. Operating on the Web Audio API with a dedicated multi-threaded `AudioWorkletNode`, AURA combines analog circuit emulation, zero-latency sample synthesis, microtonal music theory, acoustic reference monitoring, and mobile-optimized tactile interaction.

---

## 2. Chronological Request & Feature Map

### User Prompts & Objectives
1. **Initial Objective**: Build a professional mobile audio workstation companion with low-latency DSP, touch-first responsive controls, visual feedback, and real-time audio routing.
2. **Audio Engineering Expansion**: Integrate professional-grade DSP algorithms (biquad topologies, waveshaping, saturations), 16 pro audio plugins, analog hardware component fusion, microtonal and historical tuning systems, and procedural UI auditory navigation.
3. **Sample Ingestion Hub**: Implement MPC-style sampler pads with infinite banks, file uploads, mic recording, and URL ingestion.
4. **Bug Triage**: Fix the `Failed to load sample from URL: Load failed` error occurring when users attempt to ingest remote audio URLs or streaming links.
5. **Full Documentation**: Provide a detailed chronicle of what was requested, what was built, how each subsystem was engineered, and the mathematical and architectural foundations.

---

## 3. Architecture & Subsystem Breakdown

### 3.1 AudioWorklet & Main Thread Dual-Engine Architecture
AURA uses an asynchronous dual-engine paradigm:
- **AudioWorklet (`/src/audio/dspProcessorCode.ts`)**: Runs on a separate high-priority audio thread. Performs real-time sample processing in 128-frame blocks without garbage collector interruptions.
- **Engine Controller (`/src/audio/AudioEngine.ts`)**: Central singleton orchestrating routing graphs, parameter synchronization, MIDI events, bank management, and offline rendering.

```
       [ Client Browser UI / Touch Gestures ]
                         │
                         ▼
        [ AudioEngine Singleton Controller ]
          ├── Sampler Pad Banks & Buffer Cache
          ├── Reference Lab Controller
          ├── System Tuner Controller
          └── Live Tracking Controller
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
    [ AudioWorklet Node ]    [ Express Audio Proxy ]
    (Real-time DSP Thread)   (CORS Bypass / Streaming Triage)
             │                       │
             ▼                       ▼
     [ Audio Output ]        [ Remote Audio Files ]
```

---

### 3.2 Zero-Allocation DSP Math Engine (`/src/audio/dsp/dspMath.ts`)
Implements Robert Bristow-Johnson (RBJ) audio EQ biquad topologies and physical modeling formulas:
- **RBJ Biquad Filter Coefficients**: Lowpass, Highpass, Bandpass, Notch, Peaking, Low Shelf, and High Shelf:
  $$\omega_0 = 2\pi \frac{f_0}{F_s}, \quad \alpha = \frac{\sin(\omega_0)}{2Q}$$
- **Zero-Allocation Processing Loop**: Reuses persistent scratch buffers for filter state variables ($x_1, x_2, y_1, y_2$) to prevent memory allocation during real-time audio cycles.
- **Analog Waveshaping & Saturation**:
  - Soft Tanh Saturation: $y = \tanh(k \cdot x)$
  - Asymmetric Tube Triode Saturation: Emulates even-harmonic 2nd and 4th order warmth.
  - Symmetrical Hard Diode Clipping.
- **Acoustic Air Absorption Modeling**: Frequency-dependent atmospheric attenuation calculated according to ISO 9613-1:
  $$\alpha(f, T, \text{RH}) \text{ dB/m}$$

---

### 3.3 Hardware Component Fusion (`/src/audio/dsp/hardwareFusionEngine.ts`)
Emulates real physical component non-linearities and tolerances:
1. **Op-Amp Slew Rate Limiting**: Models slew rate voltage ceilings ($V/\mu s$) preventing instant transients, generating authentic analog slew distortion.
2. **Magnetic Transformer Core Hysteresis**: Non-linear core flux saturation and low-end magnetic head bump.
3. **Vacuum Tube Triode Grid Current**: Asymmetric saturation, cathode bias compression, and 2nd harmonic excitation.
4. **Tape Wow, Flutter & Hiss**: Dual modulated delay lines driven by stochastic $1/f$ pink noise and sinusoidal mechanical motor drift.
5. **Component Tolerances & Aging**: Resistor Johnson-Nyquist thermal noise and electrolytic capacitor equivalent series resistance (ESR) leakage.

---

### 3.4 Microtonal Music Theory Engine (`/src/audio/dsp/musicTheoryEngine.ts`)
Extends beyond 12-Tone Equal Temperament (12-TET) into historical, ethnic, and psychoacoustic tuning:
- **Tuning Systems**:
  - 12-TET (Standard 100-cent semitones)
  - Just Intonation (Ptolemaic Diatonic based on small integer ratios: $9/8, 5/4, 4/3, 3/2, 5/3, 15/8, 2/1$)
  - Pythagorean Tuning (Pure $3:2$ fifth ratios)
  - Quarter-Comma Meantone (Historical Renaissance tuning)
  - 24-TET / Arabic Quartertones (50-cent microtonal maqam steps)
- **Harmonic Series Generator**: Generates natural overtone series $f_n = n \cdot f_0$ and inharmonicity modeling:
  $$f_n = n \cdot f_0 \sqrt{1 + B \cdot n^2}$$
- **Real-Time Pitch Quantizer**: Snap continuous microtonal inputs or vocal tracking to target musical scales.

---

### 3.5 Reference Lab & Room Acoustic Tuner
- **Reference Lab (`ReferenceLabController.ts`, `ReferenceLabView.tsx`)**:
  - Target frequency response profiles: Harman Target 2019, Diffuse Field, Free Field, Flat Studio Reference, Club Sub-Heavy curve.
  - Compares live mic/input spectrum against reference targets and calculates correction curves.
- **System Tuner (`SystemTunerController.ts`, `SystemTunerView.tsx`)**:
  - Pink noise and sine sweep generation.
  - RT60 reverberation decay calculation ($T_{60} = 0.161 \frac{V}{S \bar{\alpha}}$).
  - Delay phase alignment and multi-band acoustic room correction EQ.

---

### 3.6 Sampler & Ingestion Hub (`SamplerPadView.tsx`, `AudioEngine.ts`, `server.ts`)
- **16 Drum Pads with Infinite Banks**:
  - Pre-loaded banks: 2020s Drill, 2010s Trap, 90s Boom-Bap, 80s Electro, 70s Soul, plus user custom banks.
- **Sample Ingestion Channels**:
  1. **Instant Studio Presets**: 16 procedurally synthesized samples (808s, kicks, snares, hats, claps, vocal chops, Rhodes, pluck, vinyl FX) with zero network latency.
  2. **URL Fetch with Proxy**: Two-tier ingestion attempting direct CORS fetch first, falling back to `/api/proxy-audio` on Node.js to bypass browser origin limits.
  3. **Streaming Link Resolver** (`streamLinkResolver.ts`, `/api/resolve-link`): YouTube, Spotify, Apple Music, Deezer, SoundCloud, TikTok, Tidal, Bandcamp, and Amazon Music links resolve to a fetchable audio URL. Spotify, Apple, and Deezer use the platform's official 30-second preview. Other sites match the public title to a store preview. Direct audio URLs still load in full. Full-stream ripping is not performed.
  4. **Microphone Recording**: Direct 2-second vocal or beatbox capture with automatic normalization.
  5. **File Upload**: Supports local `.wav`, `.mp3`, `.ogg`, and `.flac`.
- **16-Levels Melodic Spread**: Chromatically pitches any selected sample across all 16 pads from $-8$ to $+7$ semitones.
- **Sound Pack DAW Export**: Exports banks to FL Studio FPC, BandLab Sampler, or GarageBand Drum Machine Designer.

---

### 3.7 Procedural UI Sound Engine (`navigationSoundEngine.ts`)
- Synthesizes micro-clicks ($2.4\text{ kHz}$ bandpassed impulses), rotary knob detent clicks, bypass relay switches, and tab shifts on-the-fly using the Web Audio API without asset loading.

---

## 4. Source File Directory Reference

| Path | Purpose |
|---|---|
| `/server.ts` | Express server hosting Vite middleware and `/api/proxy-audio` CORS proxy |
| `/src/audio/AudioEngine.ts` | Core engine orchestrator, node routing, buffer cache, preset & URL loading |
| `/src/audio/sampleSynthesizer.ts` | In-memory procedural studio sample generation |
| `/src/audio/dsp/dspMath.ts` | Biquad coefficients, waveshapers, zero-allocation buffers, air absorption |
| `/src/audio/dsp/hardwareFusionEngine.ts` | Op-amp slew, transformers, vacuum tubes, tape wow/flutter/hiss |
| `/src/audio/dsp/musicTheoryEngine.ts` | Microtonal tuning (Just, Pythagorean, Meantone, 24-TET), harmonic series |
| `/src/audio/dsp/navigationSoundEngine.ts` | Procedural UI feedback audio synthesis |
| `/src/audio/ReferenceLabController.ts` | Reference target curves and audio spectrum matching |
| `/src/audio/SystemTunerController.ts` | Room acoustic measurement, pink noise, RT60, alignment delay |
| `/src/audio/LiveTrackingController.ts` | Low-latency pitch and formants detection |
| `/src/components/SamplerPadView.tsx` | MPC-style 16-pad sampler, URL/mic/preset modal, sound pack exporter |
| `/src/components/SpectralVisualizer.tsx` | High-FPS Canvas FFT visualizer, Lissajous vectorscope, LUFS meters |
| `/src/components/TactileKnob.tsx` | Skeuomorphic rotary dial with touch/drag inertia and double-tap reset |
| `/src/components/ProDspLabView.tsx` | Pro DSP lab interface for tuning, hardware fusion, and acoustic testing |
| `/src/components/ReferenceLabView.tsx` | Reference curves and frequency response visualizer |
| `/src/components/SystemTunerView.tsx` | Room measurement sweep and delay calibration interface |
| `/src/components/FxRackView.tsx` | 15-plugin modular hardware-modeled FX rack |
| `/src/components/PianoView.tsx` | Touch piano keyboard with scale snapping and pitch modulation |

---

## 5. Development & Deployment

- **Development**: `npm run dev` (Runs `tsx server.ts` with Vite middleware on port 3000)
- **Production Build**: `npm run build`
- **Lint / Typecheck**: `npm run lint`
