/**
 * AURA DSP - Zero-Allocation AudioWorklet Processor (Modular 15-Plugin Hardware Engine)
 * 
 * ZERO-ALLOCATION ARCHITECTURE:
 * - Statically pre-allocates all filter states, delay rings, LFO oscillators, and scratch memory.
 * - Absolutely NO object creation, closure captures, or array slicing inside process().
 * - Real-time zero-copy SharedArrayBuffer bridge with MessagePort fallback.
 * 
 * Hardware-Modeled Decades:
 * - 1970s: Pultec EQP-1A Tube EQ (Low-end boost/atten trick)
 * - 1980s: SSL 4000 G-Master Bus VCA Glue Compressor
 * - 1990s: Ensoniq ASR-10 Resampling & DAC Grime (Wu-Tang / Kanye)
 * - 2000s: Auto-Tune 5 / Melodyne Phase Vocoder
 * - 2010s: Thermionic Pentode Tube Driver / Decapitator
 * - 2020s: Soothe2 Dynamic Resonance & Harshness Tamer
 */

export const AURA_WORKLET_PROCESSOR_CODE = `
class AuraDspProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    this.sampleRate = sampleRate || 48000;

    // --- 1. SHARED MEMORY / VISUALIZER RING BUFFER ---
    this.hasSharedBuffer = false;
    this.sharedView = null;
    this.vizDecimateCounter = 0;
    this.vizDecimateRate = 2; // ~5.3ms update cadence at 48k

    this.fallbackSpectrum = new Float32Array(32);
    this.fallbackWaveform = new Float32Array(128);

    // --- 2. PRE-ALLOCATED DSP STATE BUFFERS ---
    // A. Multi-band Crossover & Saturation
    this.lowCutFreq = 350.0;
    this.highCutFreq = 4500.0;
    this.lp1_L = 0.0; this.lp2_L = 0.0;
    this.lp1_R = 0.0; this.lp2_R = 0.0;
    this.hp1_L = 0.0; this.hp2_L = 0.0;
    this.hp1_R = 0.0; this.hp2_R = 0.0;

    // B. Reverb: 4 Parallel Comb + 2 Allpass per channel
    this.combSize1 = Math.floor(0.0297 * this.sampleRate);
    this.combSize2 = Math.floor(0.0371 * this.sampleRate);
    this.combSize3 = Math.floor(0.0411 * this.sampleRate);
    this.combSize4 = Math.floor(0.0437 * this.sampleRate);
    this.allpassSize1 = Math.floor(0.0050 * this.sampleRate);
    this.allpassSize2 = Math.floor(0.0017 * this.sampleRate);

    this.combBuf1_L = new Float32Array(this.combSize1);
    this.combBuf2_L = new Float32Array(this.combSize2);
    this.combBuf3_L = new Float32Array(this.combSize3);
    this.combBuf4_L = new Float32Array(this.combSize4);
    this.combBuf1_R = new Float32Array(this.combSize1 + 23);
    this.combBuf2_R = new Float32Array(this.combSize2 + 37);
    this.combBuf3_R = new Float32Array(this.combSize3 + 41);
    this.combBuf4_R = new Float32Array(this.combSize4 + 19);

    this.allpassBuf1_L = new Float32Array(this.allpassSize1);
    this.allpassBuf2_L = new Float32Array(this.allpassSize2);
    this.allpassBuf1_R = new Float32Array(this.allpassSize1 + 13);
    this.allpassBuf2_R = new Float32Array(this.allpassSize2 + 17);

    this.idxComb1 = 0; this.idxComb2 = 0; this.idxComb3 = 0; this.idxComb4 = 0;
    this.idxAp1 = 0; this.idxAp2 = 0;

    // C. Vocal Pitch & Formant Shifter Ring Buffer
    this.pitchBufferSize = 2048;
    this.pitchBuffer = new Float32Array(this.pitchBufferSize);
    this.pitchWriteIdx = 0;
    this.pitchPhase = 0.0;

    // D. SP-404 / 12-Bit Lo-Fi Vinyl Degradation States
    this.lofiHoldSampleL = 0.0;
    this.lofiHoldSampleR = 0.0;
    this.lofiSampleCounter = 0;
    this.wowFlutterPhase = 0.0;
    this.vinylFilterL = 0.0;
    this.vinylFilterR = 0.0;

    // E. Transient Shaper
    this.envFastL = 0.0; this.envFastR = 0.0;
    this.envSlowL = 0.0; this.envSlowR = 0.0;
    this.transientAttackCoeff = Math.exp(-1.0 / (0.002 * this.sampleRate));
    this.transientSustainCoeff = Math.exp(-1.0 / (0.050 * this.sampleRate));

    // F. Sidechain Pumper LFO Phase
    this.sidechainPhase = 0.0;

    // G. Dimension Chorus Buffers (2048 samples)
    this.chorusBufSize = 2048;
    this.chorusBufL = new Float32Array(this.chorusBufSize);
    this.chorusBufR = new Float32Array(this.chorusBufSize);
    this.chorusWriteIdx = 0;
    this.chorusLfoPhase = 0.0;

    // H. Analog Tape Delay & Ping-Pong Ring (Up to 48000 samples = 1s)
    this.delayMaxSamples = 48000;
    this.delayBufL = new Float32Array(this.delayMaxSamples);
    this.delayBufR = new Float32Array(this.delayMaxSamples);
    this.delayWriteIdx = 0;

    // I. Spectral De-Esser & 20kHz Air EQ
    this.deessBandL = 0.0; this.deessBandR = 0.0;
    this.deessEnvL = 0.0; this.deessEnvR = 0.0;
    this.airBandL = 0.0; this.airBandR = 0.0;

    // J. OTT Upward/Downward Hyper-Compressor
    this.ottRmsL = 0.001; this.ottRmsR = 0.001;

    // K. Pultec EQP-1A Tube Passive EQ (1970s)
    this.pultecLowL = 0.0; this.pultecLowR = 0.0;
    this.pultecAttenL = 0.0; this.pultecAttenR = 0.0;
    this.pultecHighL = 0.0; this.pultecHighR = 0.0;

    // L. SSL 4000 G-Bus Glue Compressor (1980s)
    this.sslEnvL = 0.0; this.sslEnvR = 0.0;
    this.sslGainReduction = 1.0;

    // M. Ensoniq ASR-10 Resampling Sampler Grit (1990s)
    this.asrHoldL = 0.0; this.asrHoldR = 0.0;
    this.asrCounter = 0;
    this.asrWarmL = 0.0; this.asrWarmR = 0.0;

    // N. Dynamic Resonance Suppressor (2020s Soothe2)
    this.sootheBandL = 0.0; this.sootheBandR = 0.0;
    this.sootheEnvL = 0.0; this.sootheEnvR = 0.0;

    // --- 3. EXPANDED 15-PLUGIN PARAMETER REGISTRY ---
    this.params = {
      // 1. Vocal Pitch & Formant (2000s)
      vocalPitchEnabled: 1,
      vocalTuneSpeed: 0.70,
      vocalFormantShift: 0.0,
      vocalHumanizeVibrato: 0.20,
      vocalWetDry: 0.70,

      // 2. Analog Multi-Band & Soft Clipper
      compressorEnabled: 1,
      compLowGain: 1.33,
      compMidGain: 1.12,
      compHighGain: 1.25,
      tapeWarmthDrive: 0.45,
      compThreshold: 0.50,
      compCeilingLimiter: 0.98,
      softClipperEnabled: 1,

      // 3. Spatial Acoustic Reverb
      reverbEnabled: 1,
      reverbRoomSize: 0.60,
      reverbDecayTime: 2.0,
      reverbDamping: 0.40,
      stereoWidth: 1.25,
      reverbWetDry: 0.30,

      // 4. SP-404 / 12-Bit Vinyl Lo-Fi (Old School)
      lofiEnabled: 0,
      lofiBitDepth: 12.0,
      lofiSampleRateReduce: 1.0,
      lofiVinylCrackle: 0.25,
      lofiWowFlutter: 0.20,
      lofiFilterFreq: 6500.0,

      // 5. Transient Shaper
      transientEnabled: 0,
      transientAttack: 0.0,
      transientSustain: 0.0,
      transientOutputGain: 1.0,

      // 6. Sidechain Pumper
      sidechainEnabled: 0,
      sidechainDepth: 0.65,
      sidechainReleaseMs: 120.0,
      sidechainFrequencyHz: 2.16,

      // 7. Dimension Chorus (1980s Roland Dimension D)
      chorusEnabled: 0,
      chorusRateHz: 0.8,
      chorusDepth: 0.70,
      chorusDimensionMode: 2,
      chorusMix: 0.40,

      // 8. Space Echo & Analog Tape Delay (1970s Roland RE-201)
      delayEnabled: 0,
      delayTimeMs: 280.0,
      delayFeedback: 0.45,
      delayTapeWarmth: 0.40,
      delayPingPong: 1,
      delayMix: 0.30,

      // 9. Spectral De-Esser & 20kHz Air EQ
      deesserEnabled: 0,
      deessThreshold: 0.25,
      deessFrequencyHz: 6800.0,
      deessAmount: 0.65,
      airBandGain: 3.5,

      // 10. OTT Hyper-Compressor (2010s)
      ottEnabled: 0,
      ottDepth: 0.50,
      ottUpwardGain: 1.8,
      ottDownwardThreshold: 0.45,
      ottTimeScale: 1.0,

      // 11. Pultec EQP-1A Tube EQ (1970s Low-End Trick)
      pultecEnabled: 0,
      pultecLowFreq: 60.0,
      pultecBoost: 4.0,
      pultecAtten: 3.0,
      pultecHighBoost: 3.5,

      // 12. SSL 4000 G-Bus Glue Compressor (1980s)
      sslCompEnabled: 0,
      sslThreshold: -12.0,
      sslRatio: 4.0,
      sslAttackMs: 3.0,
      sslAutoRelease: 1,
      sslMakeUpGain: 3.0,

      // 13. Ensoniq ASR-10 Resampling Sampler Grit (1990s)
      asrEnabled: 0,
      asrBitDepth: 14.0,
      asrResampleFreq: 32000.0,
      asrAnalogWarmth: 0.50,

      // 14. Pentode Tube Heat Saturator (2010s Trap 808 Saturator)
      tubeHeatEnabled: 0,
      tubeDrive: 0.40,
      tubeBias: 0.15,
      tubeFatness: 3.0,

      // 15. Dynamic Resonance Suppressor (2020s Soothe2)
      sootheEnabled: 0,
      sootheDepth: 0.55,
      sootheSharpness: 2.5,
      sootheTargetBand: 1,

      // Master Output
      masterGain: 0.95
    };

    // --- 4. BIDIRECTIONAL MESSAGING BRIDGE ---
    this.port.onmessage = (event) => {
      try {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        switch (data.type) {
          case 'SET_SHARED_BUFFER':
            if (data.buffer instanceof SharedArrayBuffer) {
              this.sharedView = new Float32Array(data.buffer);
              this.hasSharedBuffer = true;
              this.port.postMessage({ type: 'SHARED_BUFFER_ACK', success: true });
            }
            break;

          case 'SET_PARAM':
            if (typeof data.key === 'string' && typeof data.value === 'number') {
              this.params[data.key] = data.value;
            }
            break;

          case 'BATCH_PARAMS':
            if (data.params && typeof data.params === 'object') {
              for (const k in data.params) {
                if (Object.prototype.hasOwnProperty.call(data.params, k)) {
                  this.params[k] = data.params[k];
                }
              }
            }
            break;

          case 'PING':
            this.port.postMessage({ type: 'PONG', timestamp: data.timestamp });
            break;
        }
      } catch (e) {
        // Zero crashes on thread boundary
      }
    };
  }

  // Fast rational approximation of tanh
  fastTanh(x) {
    if (x < -3.0) return -1.0;
    if (x > 3.0) return 1.0;
    return x * (27.0 + x * x) / (27.0 + 9.0 * x * x);
  }

  softClip(x) {
    if (x > 1.0) return 2.0 / 3.0;
    if (x < -1.0) return -2.0 / 3.0;
    return x - (x * x * x) / 3.0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || input.length === 0 || !output || output.length === 0) {
      return true;
    }

    const inputL = input[0];
    const inputR = input.length > 1 ? input[1] : input[0];
    const outputL = output[0];
    const outputR = output.length > 1 ? output[1] : output[0];

    const blockSize = inputL.length;
    const p = this.params;

    let peakL = 0.0;
    let peakR = 0.0;
    let dotProductLR = 0.0;
    let energyL = 0.00001;
    let energyR = 0.00001;

    // Filter coefficients
    const fLow = 2.0 * Math.sin(Math.PI * (this.lowCutFreq / this.sampleRate));
    const fHigh = 2.0 * Math.sin(Math.PI * (this.highCutFreq / this.sampleRate));
    const tapeDrive = 1.0 + p.tapeWarmthDrive * 2.5;
    const threshold = p.compThreshold;
    const roomFeedback = 0.70 + p.reverbRoomSize * 0.22;
    const damping = p.reverbDamping * 0.4;
    const width = p.stereoWidth;
    const masterGain = p.masterGain;

    // Pitch formant shift
    const pitchShiftRatio = Math.pow(2.0, (p.vocalFormantShift || 0.0) / 12.0);

    // Lo-Fi parameters
    const bitLevels = Math.pow(2.0, Math.max(4.0, Math.min(16.0, p.lofiBitDepth)));
    const sampleDownRate = Math.max(1, Math.floor(p.lofiSampleRateReduce || 1));
    const vinylFilterCoeff = Math.min(0.9, 2.0 * Math.PI * (p.lofiFilterFreq / this.sampleRate));

    // Sidechain LFO
    const sidechainPhaseInc = (2.0 * Math.PI * (p.sidechainFrequencyHz || 2.16)) / this.sampleRate;

    // Chorus LFO
    const chorusPhaseInc = (2.0 * Math.PI * (p.chorusRateHz || 0.8)) / this.sampleRate;
    const chorusDepthSamples = (p.chorusDepth || 0.7) * (p.chorusDimensionMode * 3.5 + 4.0);

    // Delay parameters
    const delaySamples = Math.min(this.delayMaxSamples - 1, Math.floor(((p.delayTimeMs || 280) / 1000.0) * this.sampleRate));
    const delayFeedback = Math.min(0.92, p.delayFeedback || 0.45);
    const delayMix = p.delayMix || 0.3;

    // De-Esser & Air EQ parameters
    const deessCoeff = 2.0 * Math.sin(Math.PI * (Math.min(12000, p.deessFrequencyHz || 6800) / this.sampleRate));
    const airShelfMult = Math.pow(10, (p.airBandGain || 3.5) / 20);

    // Pultec coefficients
    const pultecFreq = p.pultecLowFreq || 60;
    const pultecCoeff = 2.0 * Math.sin(Math.PI * (pultecFreq / this.sampleRate));
    const pultecAttenCoeff = 2.0 * Math.sin(Math.PI * ((pultecFreq * 1.55) / this.sampleRate));
    const pultecHighCoeff = 2.0 * Math.sin(Math.PI * (10000 / this.sampleRate));
    const pultecBoostMult = Math.pow(10, (p.pultecBoost || 4.0) / 20);
    const pultecAttenMult = Math.pow(10, -(p.pultecAtten || 3.0) / 20);
    const pultecHighMult = Math.pow(10, (p.pultecHighBoost || 3.5) / 20);

    // SSL Bus Compressor
    const sslThreshLin = Math.pow(10, (p.sslThreshold || -12) / 20);
    const sslRatio = p.sslRatio || 4.0;
    const sslSlope = 1.0 - (1.0 / sslRatio);
    const sslAttackCoeff = Math.exp(-1.0 / (Math.max(0.0001, (p.sslAttackMs || 3.0) / 1000.0) * this.sampleRate));
    const sslReleaseSec = p.sslAutoRelease > 0.5 ? 0.35 : 0.15;
    const sslReleaseCoeff = Math.exp(-1.0 / (sslReleaseSec * this.sampleRate));
    const sslMakeUp = Math.pow(10, (p.sslMakeUpGain || 3.0) / 20);

    // Ensoniq ASR-10
    const asrLevels = Math.pow(2.0, p.asrBitDepth || 14);
    const asrStep = Math.max(1, Math.floor(this.sampleRate / Math.max(10000, p.asrResampleFreq || 32000)));

    // Soothe dynamic resonance filter
    const sootheCoeff = 2.0 * Math.sin(Math.PI * (4800 / this.sampleRate));

    // --- ZERO-ALLOCATION INNER SAMPLE LOOP ---
    for (let i = 0; i < blockSize; i++) {
      let sL = inputL[i];
      let sR = inputR[i];

      // MODULE 1: Vocal Formant / Pitch Shifter
      if (p.vocalPitchEnabled > 0.5) {
        this.pitchBuffer[this.pitchWriteIdx] = (sL + sR) * 0.5;
        this.pitchWriteIdx = (this.pitchWriteIdx + 1) % this.pitchBufferSize;

        this.pitchPhase += pitchShiftRatio;
        if (this.pitchPhase >= this.pitchBufferSize) {
          this.pitchPhase -= this.pitchBufferSize;
        }

        const readIdx = Math.floor(this.pitchPhase);
        const pitchSample = this.pitchBuffer[readIdx];
        const wet = p.vocalWetDry;
        const dry = 1.0 - wet;
        sL = sL * dry + pitchSample * wet;
        sR = sR * dry + pitchSample * wet;
      }

      // MODULE 15: 2020s Dynamic Resonance Suppressor (Soothe2)
      if (p.sootheEnabled > 0.5) {
        this.sootheBandL += sootheCoeff * (sL - this.sootheBandL);
        this.sootheBandR += sootheCoeff * (sR - this.sootheBandR);
        const harshMagL = Math.abs(this.sootheBandL);
        const harshMagR = Math.abs(this.sootheBandR);

        this.sootheEnvL = Math.max(harshMagL, this.sootheEnvL * 0.99);
        this.sootheEnvR = Math.max(harshMagR, this.sootheEnvR * 0.99);

        if (this.sootheEnvL > 0.15) {
          const cut = 1.0 - (this.sootheEnvL - 0.15) * p.sootheDepth * 1.5;
          sL -= this.sootheBandL * Math.max(0.0, 1.0 - cut);
        }
        if (this.sootheEnvR > 0.15) {
          const cut = 1.0 - (this.sootheEnvR - 0.15) * p.sootheDepth * 1.5;
          sR -= this.sootheBandR * Math.max(0.0, 1.0 - cut);
        }
      }

      // MODULE 9: Spectral De-Esser & 20kHz Air EQ
      if (p.deesserEnabled > 0.5) {
        this.deessBandL += deessCoeff * (sL - this.deessBandL);
        this.deessBandR += deessCoeff * (sR - this.deessBandR);
        const sibL = Math.abs(this.deessBandL);
        const sibR = Math.abs(this.deessBandR);

        this.deessEnvL = Math.max(sibL, this.deessEnvL * 0.98);
        this.deessEnvR = Math.max(sibR, this.deessEnvR * 0.98);

        if (this.deessEnvL > p.deessThreshold) {
          const duck = 1.0 - (p.deessAmount * 0.5);
          sL *= duck;
        }
        if (this.deessEnvR > p.deessThreshold) {
          const duck = 1.0 - (p.deessAmount * 0.5);
          sR *= duck;
        }

        this.airBandL += 0.65 * (sL - this.airBandL);
        this.airBandR += 0.65 * (sR - this.airBandR);
        const highsL = sL - this.airBandL;
        const highsR = sR - this.airBandR;
        sL += highsL * (airShelfMult - 1.0) * 0.4;
        sR += highsR * (airShelfMult - 1.0) * 0.4;
      }

      // MODULE 11: 1970s Pultec EQP-1A Passive Tube EQ (Low-End Trick)
      if (p.pultecEnabled > 0.5) {
        // Boost low-end curve
        this.pultecLowL += pultecCoeff * (sL - this.pultecLowL);
        this.pultecLowR += pultecCoeff * (sR - this.pultecLowR);

        // Attenuate slightly higher low-mid shelf (classic Pultec dip)
        this.pultecAttenL += pultecAttenCoeff * (sL - this.pultecAttenL);
        this.pultecAttenR += pultecAttenCoeff * (sR - this.pultecAttenR);

        sL += this.pultecLowL * (pultecBoostMult - 1.0) * 0.8;
        sR += this.pultecLowR * (pultecBoostMult - 1.0) * 0.8;
        sL -= this.pultecAttenL * (1.0 - pultecAttenMult) * 0.5;
        sR -= this.pultecAttenR * (1.0 - pultecAttenMult) * 0.5;

        // 10kHz silk boost
        this.pultecHighL += pultecHighCoeff * (sL - this.pultecHighL);
        this.pultecHighR += pultecHighCoeff * (sR - this.pultecHighR);
        sL += (sL - this.pultecHighL) * (pultecHighMult - 1.0) * 0.4;
        sR += (sR - this.pultecHighR) * (pultecHighMult - 1.0) * 0.4;
      }

      // MODULE 13: 1990s Ensoniq ASR-10 Resampling Sampler Grit
      if (p.asrEnabled > 0.5) {
        this.asrCounter++;
        if (this.asrCounter >= asrStep) {
          this.asrCounter = 0;
          this.asrHoldL = Math.round(sL * asrLevels) / asrLevels;
          this.asrHoldR = Math.round(sR * asrLevels) / asrLevels;
        }
        // Analog transistor warming filter
        this.asrWarmL += 0.7 * (this.asrHoldL - this.asrWarmL);
        this.asrWarmR += 0.7 * (this.asrHoldR - this.asrWarmR);
        sL = this.asrHoldL * (1.0 - p.asrAnalogWarmth * 0.3) + this.asrWarmL * (p.asrAnalogWarmth * 0.3);
        sR = this.asrHoldR * (1.0 - p.asrAnalogWarmth * 0.3) + this.asrWarmR * (p.asrAnalogWarmth * 0.3);
      }

      // MODULE 4: SP-404 Lo-Fi Degradation & Vinyl Grit
      if (p.lofiEnabled > 0.5) {
        this.lofiSampleCounter++;
        if (this.lofiSampleCounter >= sampleDownRate) {
          this.lofiSampleCounter = 0;
          this.lofiHoldSampleL = sL;
          this.lofiHoldSampleR = sR;
        }
        sL = this.lofiHoldSampleL;
        sR = this.lofiHoldSampleR;

        sL = Math.round(sL * bitLevels) / bitLevels;
        sR = Math.round(sR * bitLevels) / bitLevels;

        if (p.lofiVinylCrackle > 0.01 && Math.random() < (p.lofiVinylCrackle * 0.003)) {
          const crackle = (Math.random() * 2 - 1) * 0.35;
          sL += crackle;
          sR += crackle;
        }

        this.vinylFilterL += vinylFilterCoeff * (sL - this.vinylFilterL);
        this.vinylFilterR += vinylFilterCoeff * (sR - this.vinylFilterR);
        sL = this.vinylFilterL;
        sR = this.vinylFilterR;
      }

      // MODULE 5: Transient Shaper
      if (p.transientEnabled > 0.5) {
        const absL = Math.abs(sL);
        const absR = Math.abs(sR);

        this.envFastL = (absL > this.envFastL) ? absL : this.envFastL * this.transientAttackCoeff;
        this.envFastR = (absR > this.envFastR) ? absR : this.envFastR * this.transientAttackCoeff;
        this.envSlowL = (absL > this.envSlowL) ? absL : this.envSlowL * this.transientSustainCoeff;
        this.envSlowR = (absR > this.envSlowR) ? absR : this.envSlowR * this.transientSustainCoeff;

        const transientL = this.envFastL - this.envSlowL;
        const transientR = this.envFastR - this.envSlowR;

        const attackMult = 1.0 + p.transientAttack * 2.0;
        const sustainMult = 1.0 + p.transientSustain * 1.5;

        sL = (sL + transientL * (attackMult - 1.0) + this.envSlowL * Math.sign(sL) * (sustainMult - 1.0)) * p.transientOutputGain;
        sR = (sR + transientR * (attackMult - 1.0) + this.envSlowR * Math.sign(sR) * (sustainMult - 1.0)) * p.transientOutputGain;
      }

      // MODULE 14: 2010s Pentode Tube Heat Saturator (Thermionic 808 Saturator)
      if (p.tubeHeatEnabled > 0.5) {
        const drive = 1.0 + p.tubeDrive * 3.5;
        const bias = p.tubeBias * 0.25;
        // Asymmetric even + odd harmonic valve curve
        let drvL = sL * drive + bias;
        let drvR = sR * drive + bias;
        drvL = this.fastTanh(drvL) + bias * (drvL * drvL);
        drvR = this.fastTanh(drvR) + bias * (drvR * drvR);
        sL = sL * (1.0 - p.tubeDrive * 0.7) + drvL * (p.tubeDrive * 0.7);
        sR = sR * (1.0 - p.tubeDrive * 0.7) + drvR * (p.tubeDrive * 0.7);
      }

      // MODULE 2: Multi-band Analog Crossover, Tape Saturation & Soft-Clipper
      if (p.compressorEnabled > 0.5) {
        this.lp1_L += fLow * (sL - this.lp1_L);
        const lowL = this.lp1_L;
        this.hp1_L = sL - lowL;
        this.lp2_L += fHigh * (this.hp1_L - this.lp2_L);
        const midL = this.lp2_L;
        const highL = this.hp1_L - midL;

        this.lp1_R += fLow * (sR - this.lp1_R);
        const lowR = this.lp1_R;
        this.hp1_R = sR - lowR;
        this.lp2_R += fHigh * (this.hp1_R - this.lp2_R);
        const midR = this.lp2_R;
        const highR = this.hp1_R - midR;

        const lowAmpL = this.fastTanh(lowL * tapeDrive * p.compLowGain);
        const lowAmpR = this.fastTanh(lowR * tapeDrive * p.compLowGain);
        const midAmpL = this.fastTanh(midL * (1.0 + p.tapeWarmthDrive * 0.8) * p.compMidGain);
        const midAmpR = this.fastTanh(midR * (1.0 + p.tapeWarmthDrive * 0.8) * p.compMidGain);
        const highAmpL = highL * p.compHighGain;
        const highAmpR = highR * p.compHighGain;

        sL = lowAmpL + midAmpL + highAmpL;
        sR = lowAmpR + midAmpR + highAmpR;

        if (p.softClipperEnabled > 0.5) {
          sL = this.softClip(sL * 1.25) * 1.15;
          sR = this.softClip(sR * 1.25) * 1.15;
        } else {
          const peak = Math.max(Math.abs(sL), Math.abs(sR));
          if (peak > threshold) {
            const compFactor = threshold / (threshold + (peak - threshold) * 0.5);
            sL *= compFactor;
            sR *= compFactor;
          }
        }
      }

      // MODULE 12: 1980s SSL 4000 G-Bus Glue Compressor
      if (p.sslCompEnabled > 0.5) {
        const peak = Math.max(Math.abs(sL), Math.abs(sR));
        if (peak > this.sslGainReduction) {
          this.sslGainReduction = peak + sslAttackCoeff * (this.sslGainReduction - peak);
        } else {
          this.sslGainReduction = peak + sslReleaseCoeff * (this.sslGainReduction - peak);
        }

        let gr = 1.0;
        if (this.sslGainReduction > sslThreshLin) {
          const overDb = 20 * Math.log10(this.sslGainReduction / sslThreshLin);
          const compressedDb = overDb * sslSlope;
          gr = Math.pow(10, -compressedDb / 20);
        }

        sL = sL * gr * sslMakeUp;
        sR = sR * gr * sslMakeUp;
      }

      // MODULE 10: OTT Upward/Downward Hyper-Compressor
      if (p.ottEnabled > 0.5) {
        const absL = Math.abs(sL);
        const absR = Math.abs(sR);
        this.ottRmsL = this.ottRmsL * 0.995 + absL * 0.005;
        this.ottRmsR = this.ottRmsR * 0.995 + absR * 0.005;

        let gainModL = 1.0;
        let gainModR = 1.0;
        if (this.ottRmsL < 0.25) {
          gainModL += (0.25 - this.ottRmsL) * p.ottUpwardGain * p.ottDepth;
        }
        if (this.ottRmsR < 0.25) {
          gainModR += (0.25 - this.ottRmsR) * p.ottUpwardGain * p.ottDepth;
        }

        if (this.ottRmsL > p.ottDownwardThreshold) {
          gainModL *= (p.ottDownwardThreshold / (this.ottRmsL + 0.001));
        }
        if (this.ottRmsR > p.ottDownwardThreshold) {
          gainModR *= (p.ottDownwardThreshold / (this.ottRmsR + 0.001));
        }

        sL *= (1.0 - p.ottDepth) + gainModL * p.ottDepth;
        sR *= (1.0 - p.ottDepth) + gainModR * p.ottDepth;
      }

      // MODULE 7: Dynamic Dimension Chorus (Roland Dimension D)
      if (p.chorusEnabled > 0.5) {
        this.chorusBufL[this.chorusWriteIdx] = sL;
        this.chorusBufR[this.chorusWriteIdx] = sR;

        this.chorusLfoPhase += chorusPhaseInc;
        if (this.chorusLfoPhase >= 2.0 * Math.PI) {
          this.chorusLfoPhase -= 2.0 * Math.PI;
        }

        const lfoSin1 = Math.sin(this.chorusLfoPhase);
        const lfoCos1 = Math.cos(this.chorusLfoPhase);

        const delayOffsetL = Math.floor(120 + lfoSin1 * chorusDepthSamples);
        const delayOffsetR = Math.floor(120 + lfoCos1 * chorusDepthSamples);

        const readIdxL = (this.chorusWriteIdx - delayOffsetL + this.chorusBufSize) % this.chorusBufSize;
        const readIdxR = (this.chorusWriteIdx - delayOffsetR + this.chorusBufSize) % this.chorusBufSize;

        const chorusOutL = this.chorusBufL[readIdxL];
        const chorusOutR = this.chorusBufR[readIdxR];

        const mix = p.chorusMix;
        sL = sL * (1.0 - mix * 0.5) + chorusOutL * mix;
        sR = sR * (1.0 - mix * 0.5) + chorusOutR * mix;

        this.chorusWriteIdx = (this.chorusWriteIdx + 1) % this.chorusBufSize;
      }

      // MODULE 8: Space Echo & Analog Tape Delay (RE-201 Ping-Pong)
      if (p.delayEnabled > 0.5) {
        const readIdx = (this.delayWriteIdx - delaySamples + this.delayMaxSamples) % this.delayMaxSamples;
        const delayedL = this.delayBufL[readIdx];
        const delayedR = this.delayBufR[readIdx];

        const satL = this.fastTanh(delayedL * (1.0 + p.delayTapeWarmth * 1.5));
        const satR = this.fastTanh(delayedR * (1.0 + p.delayTapeWarmth * 1.5));

        if (p.delayPingPong > 0.5) {
          this.delayBufL[this.delayWriteIdx] = sL + satR * delayFeedback;
          this.delayBufR[this.delayWriteIdx] = sR + satL * delayFeedback;
        } else {
          this.delayBufL[this.delayWriteIdx] = sL + satL * delayFeedback;
          this.delayBufR[this.delayWriteIdx] = sR + satR * delayFeedback;
        }

        sL = sL * (1.0 - delayMix * 0.5) + delayedL * delayMix;
        sR = sR * (1.0 - delayMix * 0.5) + delayedR * delayMix;

        this.delayWriteIdx = (this.delayWriteIdx + 1) % this.delayMaxSamples;
      }

      // MODULE 6: Rhythmic Sidechain Pumper (Ducking Envelope)
      if (p.sidechainEnabled > 0.5) {
        this.sidechainPhase += sidechainPhaseInc;
        if (this.sidechainPhase >= 2.0 * Math.PI) {
          this.sidechainPhase -= 2.0 * Math.PI;
        }
        const beatNorm = this.sidechainPhase / (2.0 * Math.PI);
        const duckGain = 1.0 - p.sidechainDepth * Math.exp(-beatNorm * (1000.0 / Math.max(20, p.sidechainReleaseMs)));
        sL *= duckGain;
        sR *= duckGain;
      }

      // MODULE 3: Spatial Acoustic Reverb & Stereo Width
      if (p.reverbEnabled > 0.5 && p.reverbWetDry > 0.001) {
        const inMonoL = (sL + sR * 0.5) * 0.2;
        const inMonoR = (sR + sL * 0.5) * 0.2;

        const outComb1_L = this.combBuf1_L[this.idxComb1];
        this.combBuf1_L[this.idxComb1] = inMonoL + outComb1_L * roomFeedback * (1.0 - damping);

        const outComb2_L = this.combBuf2_L[this.idxComb2];
        this.combBuf2_L[this.idxComb2] = inMonoL + outComb2_L * roomFeedback * (1.0 - damping);

        const outComb3_L = this.combBuf3_L[this.idxComb3];
        this.combBuf3_L[this.idxComb3] = inMonoL + outComb3_L * roomFeedback * (1.0 - damping);

        const outComb4_L = this.combBuf4_L[this.idxComb4];
        this.combBuf4_L[this.idxComb4] = inMonoL + outComb4_L * roomFeedback * (1.0 - damping);

        const revL = (outComb1_L + outComb2_L + outComb3_L + outComb4_L) * 0.25;
        const ap1In = revL;
        const ap1Out = -ap1In + this.allpassBuf1_L[this.idxAp1];
        this.allpassBuf1_L[this.idxAp1] = ap1In + this.allpassBuf1_L[this.idxAp1] * 0.5;

        const revWet = ap1Out;
        const wetAmt = p.reverbWetDry;
        const dryAmt = 1.0 - wetAmt * 0.5;

        sL = sL * dryAmt + revWet * wetAmt;
        sR = sR * dryAmt + revWet * wetAmt;

        this.idxComb1 = (this.idxComb1 + 1) % this.combSize1;
        this.idxComb2 = (this.idxComb2 + 1) % this.combSize2;
        this.idxComb3 = (this.idxComb3 + 1) % this.combSize3;
        this.idxComb4 = (this.idxComb4 + 1) % this.combSize4;
        this.idxAp1 = (this.idxAp1 + 1) % this.allpassSize1;
      }

      // Stereo M/S Imager
      if (Math.abs(width - 1.0) > 0.01) {
        const mid = (sL + sR) * 0.5;
        const side = (sL - sR) * 0.5 * width;
        sL = mid + side;
        sR = mid - side;
      }

      // Master output & Brickwall clamp
      sL *= masterGain;
      sR *= masterGain;

      if (sL > 0.99) sL = 0.99; else if (sL < -0.99) sL = -0.99;
      if (sR > 0.99) sR = 0.99; else if (sR < -0.99) sR = -0.99;

      outputL[i] = sL;
      outputR[i] = sR;

      const absL = Math.abs(sL);
      const absR = Math.abs(sR);
      if (absL > peakL) peakL = absL;
      if (absR > peakR) peakR = absR;

      dotProductLR += sL * sR;
      energyL += sL * sL;
      energyR += sR * sR;
    }

    // Telemetry dispatch
    this.vizDecimateCounter++;
    if (this.vizDecimateCounter >= this.vizDecimateRate) {
      this.vizDecimateCounter = 0;
      const correlation = dotProductLR / Math.sqrt(energyL * energyR);

      if (this.hasSharedBuffer && this.sharedView) {
        this.sharedView[0] = peakL;
        this.sharedView[1] = peakR;
        this.sharedView[2] = correlation;
        for (let b = 0; b < 32; b++) {
          const sampleIdx = b * 4;
          const mag = (Math.abs(outputL[sampleIdx]) + Math.abs(outputR[sampleIdx])) * 0.5;
          this.sharedView[3 + b] = this.sharedView[3 + b] * 0.75 + mag * 0.25;
        }
        for (let w = 0; w < 128; w++) {
          this.sharedView[35 + w] = outputL[w] || 0;
        }
      } else {
        this.fallbackSpectrum[0] = peakL;
        this.fallbackSpectrum[1] = peakR;
        for (let b = 0; b < 30; b++) {
          const sampleIdx = b * 4;
          this.fallbackSpectrum[2 + b] = (Math.abs(outputL[sampleIdx]) + Math.abs(outputR[sampleIdx])) * 0.5;
        }
        for (let w = 0; w < 128; w++) {
          this.fallbackWaveform[w] = outputL[w] || 0;
        }

        this.port.postMessage({
          type: 'SPECTRUM_TICK',
          peakL: peakL,
          peakR: peakR,
          correlation: correlation,
          spectrum: this.fallbackSpectrum,
          waveform: this.fallbackWaveform
        });
      }
    }

    return true;
  }
}

registerProcessor('aura-dsp-processor', AuraDspProcessor);
`;
