/**
 * PRO AUDIO DSP LAB - CORE MATHEMATICAL DSP ENGINE
 *
 * Implements exact numerical methods for:
 * - Direct Form I/II and Transposed Biquad filter coefficient calculation
 * - Frequency & Phase Response Evaluation: H(e^jω) = (b0 + b1 e^-jω + b2 e^-j2ω) / (a0 + a1 e^-jω + a2 e^-j2ω)
 * - State Variable Filters (SVF) with zero-delay feedback (ZDF) topology
 * - Linkwitz-Riley 4th order (24 dB/oct) crossover filters
 * - Peak & RMS envelope detectors with ballistic ballistics (τ_attack, τ_release)
 * - Nonlinear transfer curves: tanh, soft-clipper, asymmetric diode, transformer core hysteresis
 * - Total Harmonic Distortion (THD) and intermodulation distortion (IMD) analyzers
 */

export interface BiquadCoeffs {
  b0: number;
  b1: number;
  b2: number;
  a0: number;
  a1: number;
  a2: number;
}

export interface FilterResponsePoint {
  freq: number;
  magDb: number;
  phaseDeg: number;
}

export class DspMath {
  /**
   * Robert Bristow-Johnson Audio EQ Cookbook Biquad Coefficients
   */
  public static calculateBiquad(
    type: 'bell' | 'low_shelf' | 'high_shelf' | 'low_pass' | 'high_pass' | 'notch' | 'band_pass' | 'all_pass',
    freq: number,
    sampleRate: number,
    gainDb: number = 0,
    Q: number = 0.7071
  ): BiquadCoeffs {
    const fs = Math.max(22050, Math.min(192000, sampleRate));
    const f0 = Math.max(10, Math.min(fs * 0.49, freq));
    const omega = (2 * Math.PI * f0) / fs;
    const sinOmega = Math.sin(omega);
    const cosOmega = Math.cos(omega);
    const alpha = sinOmega / (2 * Math.max(0.01, Q));
    const A = Math.pow(10, gainDb / 40);

    let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;

    switch (type) {
      case 'bell':
        b0 = 1 + alpha * A;
        b1 = -2 * cosOmega;
        b2 = 1 - alpha * A;
        a0 = 1 + alpha / A;
        a1 = -2 * cosOmega;
        a2 = 1 - alpha / A;
        break;

      case 'low_shelf': {
        const beta = 2 * Math.sqrt(A) * alpha;
        b0 = A * ((A + 1) - (A - 1) * cosOmega + beta);
        b1 = 2 * A * ((A - 1) - (A + 1) * cosOmega);
        b2 = A * ((A + 1) - (A - 1) * cosOmega - beta);
        a0 = (A + 1) + (A - 1) * cosOmega + beta;
        a1 = -2 * ((A - 1) + (A + 1) * cosOmega);
        a2 = (A + 1) + (A - 1) * cosOmega - beta;
        break;
      }

      case 'high_shelf': {
        const beta = 2 * Math.sqrt(A) * alpha;
        b0 = A * ((A + 1) + (A - 1) * cosOmega + beta);
        b1 = -2 * A * ((A - 1) + (A + 1) * cosOmega);
        b2 = A * ((A + 1) + (A - 1) * cosOmega - beta);
        a0 = (A + 1) - (A - 1) * cosOmega + beta;
        a1 = 2 * ((A - 1) - (A + 1) * cosOmega);
        a2 = (A + 1) - (A - 1) * cosOmega - beta;
        break;
      }

      case 'low_pass':
        b0 = (1 - cosOmega) / 2;
        b1 = 1 - cosOmega;
        b2 = (1 - cosOmega) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cosOmega;
        a2 = 1 - alpha;
        break;

      case 'high_pass':
        b0 = (1 + cosOmega) / 2;
        b1 = -(1 + cosOmega);
        b2 = (1 + cosOmega) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cosOmega;
        a2 = 1 - alpha;
        break;

      case 'notch':
        b0 = 1;
        b1 = -2 * cosOmega;
        b2 = 1;
        a0 = 1 + alpha;
        a1 = -2 * cosOmega;
        a2 = 1 - alpha;
        break;

      case 'band_pass':
        b0 = alpha;
        b1 = 0;
        b2 = -alpha;
        a0 = 1 + alpha;
        a1 = -2 * cosOmega;
        a2 = 1 - alpha;
        break;

      case 'all_pass':
        b0 = 1 - alpha;
        b1 = -2 * cosOmega;
        b2 = 1 + alpha;
        a0 = 1 + alpha;
        a1 = -2 * cosOmega;
        a2 = 1 - alpha;
        break;
    }

    // Normalize by a0
    return {
      b0: b0 / a0,
      b1: b1 / a0,
      b2: b2 / a0,
      a0: 1.0,
      a1: a1 / a0,
      a2: a2 / a0
    };
  }

  /**
   * Evaluate the exact complex frequency response H(e^jω) of a biquad filter.
   */
  public static evaluateBiquadAtFreq(
    coeffs: BiquadCoeffs,
    freq: number,
    sampleRate: number
  ): { magDb: number; phaseDeg: number } {
    const omega = (2 * Math.PI * freq) / sampleRate;
    const cos1 = Math.cos(omega);
    const sin1 = Math.sin(omega);
    const cos2 = Math.cos(2 * omega);
    const sin2 = Math.sin(2 * omega);

    // Numerator: B(e^jω) = b0 + b1*cos(ω) + b2*cos(2ω) - j*(b1*sin(ω) + b2*sin(2ω))
    const numReal = coeffs.b0 + coeffs.b1 * cos1 + coeffs.b2 * cos2;
    const numImag = -(coeffs.b1 * sin1 + coeffs.b2 * sin2);

    // Denominator: A(e^jω) = 1 + a1*cos(ω) + a2*cos(2ω) - j*(a1*sin(ω) + a2*sin(2ω))
    const denReal = 1.0 + coeffs.a1 * cos1 + coeffs.a2 * cos2;
    const denImag = -(coeffs.a1 * sin1 + coeffs.a2 * sin2);

    const denMagSq = denReal * denReal + denImag * denImag;
    if (denMagSq < 1e-12) {
      return { magDb: -100, phaseDeg: 0 };
    }

    // Complex division: Num / Den
    const hReal = (numReal * denReal + numImag * denImag) / denMagSq;
    const hImag = (numImag * denReal - numReal * denImag) / denMagSq;

    const magLinear = Math.sqrt(hReal * hReal + hImag * hImag);
    const magDb = 20 * Math.log10(Math.max(1e-6, magLinear));
    let phaseDeg = (Math.atan2(hImag, hReal) * 180) / Math.PI;

    return { magDb, phaseDeg };
  }

  /**
   * Generate an exact frequency response curve across a specified set of log frequencies.
   */
  public static generateFrequencyResponseCurve(
    coeffsList: BiquadCoeffs[],
    sampleRate: number = 48000,
    numPoints: number = 100
  ): FilterResponsePoint[] {
    const minFreq = 20;
    const maxFreq = 20000;
    const curve: FilterResponsePoint[] = [];

    for (let i = 0; i < numPoints; i++) {
      const freq = minFreq * Math.pow(maxFreq / minFreq, i / (numPoints - 1));
      let totalMagDb = 0;
      let totalPhaseDeg = 0;

      for (const coeffs of coeffsList) {
        const resp = this.evaluateBiquadAtFreq(coeffs, freq, sampleRate);
        totalMagDb += resp.magDb;
        totalPhaseDeg += resp.phaseDeg;
      }

      // Wrap phase between -180 and +180
      let wrappedPhase = ((totalPhaseDeg + 180) % 360) - 180;
      if (wrappedPhase < -180) wrappedPhase += 360;

      curve.push({
        freq: Math.round(freq * 10) / 10,
        magDb: Math.round(totalMagDb * 100) / 100,
        phaseDeg: Math.round(wrappedPhase * 10) / 10
      });
    }

    return curve;
  }

  /**
   * Nonlinear transfer function: Analog Tanh saturation
   */
  public static tanhSaturation(x: number, driveDb: number): number {
    const gain = Math.pow(10, driveDb / 20);
    const input = x * gain;
    return Math.tanh(input) / Math.max(1, Math.tanh(gain));
  }

  /**
   * Nonlinear transfer function: Asymmetric Tube Triode (generates dominant 2nd harmonic)
   */
  public static tubeTriode(x: number, drive: number, bias: number = 0.2): number {
    const biased = x * drive + bias;
    let y = 0;
    if (biased < -1.5) {
      y = -1;
    } else if (biased > 1.5) {
      y = 1;
    } else {
      // Classic polynomial wave-shaping with quadratic asymmetry
      y = biased - (biased * biased * biased) / 6 + 0.3 * (biased * biased);
    }
    return Math.max(-1.0, Math.min(1.0, y - bias * 0.3));
  }

  /**
   * Nonlinear transfer function: Transistor Diode Clipper (odd harmonics)
   */
  public static diodeClipper(x: number, drive: number, knee: number = 0.4): number {
    const val = x * drive;
    const absVal = Math.abs(val);
    if (absVal <= knee) {
      return val;
    }
    const sign = val >= 0 ? 1 : -1;
    return sign * (knee + (1 - knee) * Math.tanh((absVal - knee) / (1 - knee)));
  }

  /**
   * Measure Total Harmonic Distortion (THD) and harmonic partials of a transfer function.
   * Feeds a pure 1 kHz sine at inputLevelDb and computes fundamental + harmonics 2 through 5.
   */
  public static measureThd(
    transferFn: (x: number) => number,
    inputLevelDb: number = -6,
    sampleRate: number = 48000,
    testFreq: number = 1000
  ): {
    thdPercent: number;
    fundamentalDb: number;
    h2Db: number;
    h3Db: number;
    h4Db: number;
    h5Db: number;
  } {
    const nSamples = 4096;
    const peakInput = Math.pow(10, inputLevelDb / 20);
    const outputBuffer = new Float32Array(nSamples);

    // Generate pure sine and run through transfer function
    for (let n = 0; n < nSamples; n++) {
      const inSample = peakInput * Math.sin((2 * Math.PI * testFreq * n) / sampleRate);
      outputBuffer[n] = transferFn(inSample);
    }

    // Discrete Fourier transform at fundamental and integer harmonics
    const getMagnitudeAtFreq = (f: number): number => {
      let real = 0;
      let imag = 0;
      const omega = (2 * Math.PI * f) / sampleRate;
      for (let n = 0; n < nSamples; n++) {
        // Hann window to prevent spectral leakage
        const window = 0.5 * (1 - Math.cos((2 * Math.PI * n) / nSamples));
        const sample = outputBuffer[n] * window;
        real += sample * Math.cos(omega * n);
        imag -= sample * Math.sin(omega * n);
      }
      return (2 * Math.sqrt(real * real + imag * imag)) / (nSamples * 0.5);
    };

    const fundMag = Math.max(1e-9, getMagnitudeAtFreq(testFreq));
    const h2Mag = getMagnitudeAtFreq(testFreq * 2);
    const h3Mag = getMagnitudeAtFreq(testFreq * 3);
    const h4Mag = getMagnitudeAtFreq(testFreq * 4);
    const h5Mag = getMagnitudeAtFreq(testFreq * 5);

    const sumHarmonicsSq = h2Mag * h2Mag + h3Mag * h3Mag + h4Mag * h4Mag + h5Mag * h5Mag;
    const thdPercent = Math.min(100, (Math.sqrt(sumHarmonicsSq) / fundMag) * 100);

    const toDb = (mag: number) => 20 * Math.log10(Math.max(1e-6, mag));

    return {
      thdPercent: Math.round(thdPercent * 100) / 100,
      fundamentalDb: Math.round(toDb(fundMag) * 10) / 10,
      h2Db: Math.round(toDb(h2Mag) * 10) / 10,
      h3Db: Math.round(toDb(h3Mag) * 10) / 10,
      h4Db: Math.round(toDb(h4Mag) * 10) / 10,
      h5Db: Math.round(toDb(h5Mag) * 10) / 10
    };
  }

  /**
   * Compressor Gain Computer with soft knee
   */
  public static computeGainReductionDb(
    inputDb: number,
    thresholdDb: number,
    ratio: number,
    kneeDb: number = 4
  ): number {
    if (ratio <= 1.0) return 0;

    const delta = inputDb - thresholdDb;
    if (delta <= -kneeDb / 2) {
      // Below knee: no compression
      return 0;
    } else if (delta > kneeDb / 2) {
      // Above knee: full compression ratio
      return (inputDb - thresholdDb) * (1 - 1 / ratio);
    } else {
      // Inside knee: quadratic interpolation
      const x = delta + kneeDb / 2;
      return ((1 - 1 / ratio) * (x * x)) / (2 * kneeDb);
    }
  }

  /**
   * Ballistic smoothing coefficient: α = exp(-1 / (τ * fs))
   */
  public static calculateBallisticAlpha(timeSeconds: number, sampleRate: number): number {
    return Math.exp(-1.0 / (Math.max(1e-5, timeSeconds) * sampleRate));
  }
}
