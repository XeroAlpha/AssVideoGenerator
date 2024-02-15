import { spawn } from 'child_process';
import { waitForProcess } from './common';

export interface LoudnormOptions {
  integrated: number;
  truePeak: number;
  lra: number;
}

export const defaultLoudnormOptions: LoudnormOptions = {
  integrated: -16,
  truePeak: -1.5,
  lra: 11,
};

export async function calculateLoudnormArgs(videoPath: string, options: LoudnormOptions) {
  const loudnormCommon = [`I=${options.integrated}`, `LRA=${options.lra}`, `TP=${options.truePeak}`];
  const loudnormMeasurePass = [...loudnormCommon, `print_format=json`];
  const proc = spawn(
    'ffmpeg',
    ['-i', videoPath, '-af', `loudnorm=${loudnormMeasurePass.join(':')}`, '-f', 'null', '-'],
    { stdio: 'pipe' }
  );
  const data: Buffer[] = [];
  proc.stderr.on('data', (chunk) => {
    data.push(chunk);
  });
  await waitForProcess(proc);
  const output = Buffer.concat(data).toString();
  const outputMatch = output.match(/\[Parsed_loudnorm.+\s+(\{([^}]+)\})/);
  if (!outputMatch) {
    throw new Error(`Cannot measure loudnorm information`);
  }
  const measured = JSON.parse(outputMatch[1]);
  const clamp = (value: string | number, min: number, max: number, defaultValue: number) => {
    const v = Number(value);
    return isFinite(v) ? Math.min(Math.max(v, min), max) : defaultValue;
  };
  const loudnormActionPass = [
    ...loudnormCommon,
    `measured_I=${clamp(measured.input_i, -99, 0, 0)}`,
    `measured_LRA=${clamp(measured.input_lra, 0, 99, 0)}`,
    `measured_TP=${clamp(measured.input_tp, -99, 99, 0)}`,
    `measured_thresh=${clamp(measured.input_thresh, -99, 0, 0)}`,
    `offset=${clamp(measured.target_offset, -99, 99, 0)}`,
    `linear=true`,
  ];
  return loudnormActionPass.join(':');
}
