/**
 * Progress indicators and spinners for terminal output
 */

import { TerminalColors } from '../utils/colors';
import { TerminalFormatters } from '../utils/formatters';
import type { ProgressBarOptions, SpinnerOptions } from '../types';

export class ProgressBar {
  private options: ProgressBarOptions;
  private currentValue = 0;
  private maxValue = 100;
  private startTime = Date.now();
  private lastRender = '';

  constructor(options: Partial<ProgressBarOptions> = {}) {
    this.options = {
      width: 40,
      char: '█',
      emptyChar: '░',
      showPercent: true,
      showTime: true,
      animated: true,
      ...options
    };
  }

  update(current: number, total: number): string {
    this.currentValue = current;
    this.maxValue = total;

    if (this.maxValue === 0) return this.renderEmpty();

    const percentage = Math.min(100, Math.max(0, (current / total) * 100));
    const filledLength = Math.round((percentage / 100) * this.options.width);
    const emptyLength = this.options.width - filledLength;

    const filledBar = this.options.char.repeat(filledLength);
    const emptyBar = this.options.emptyChar.repeat(emptyLength);
    const bar = `${TerminalColors.success(filledBar)}${TerminalColors.muted(emptyBar)}`;

    let output = `[${bar}]`;

    if (this.options.showPercent) {
      output += ` ${percentage.toFixed(1)}%`;
    }

    if (this.options.showTime) {
      const elapsed = Date.now() - this.startTime;
      const remaining = total > 0 ? (elapsed / current) * (total - current) : 0;
      output += ` (${TerminalColors.info(TerminalFormatters.formatDuration(elapsed))}`;
      if (remaining > 0 && current > 0) {
        output += ` / ${TerminalColors.warning(TerminalFormatters.formatDuration(remaining))}`;
      }
      output += ')';
    }

    this.lastRender = output;
    return output;
  }

  increment(amount = 1): string {
    return this.update(this.currentValue + amount, this.maxValue);
  }

  setPercentage(percentage: number): string {
    return this.update(percentage, 100);
  }

  complete(): string {
    return this.update(this.maxValue, this.maxValue);
  }

  private renderEmpty(): string {
    const emptyBar = this.options.emptyChar.repeat(this.options.width);
    return `[${TerminalColors.muted(emptyBar)}] 0.0%`;
  }

  getLastRender(): string {
    return this.lastRender;
  }
}

export class Spinner {
  private options: SpinnerOptions;
  private currentFrame = 0;
  private interval: NodeJS.Timeout | null = null;
  private isSpinning = false;
  private lastRender = '';

  constructor(options: Partial<SpinnerOptions> = {}) {
    const defaultSpinners = {
      dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
      line: ['-', '\\', '|', '/'],
      arrow: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
      square: ['◐', '◓', '◑', '◒'],
      circle: ['◴', '◷', '◶', '◵'],
      pulse: ['•', '○', '•', '○'],
      braille: ['⠋', '⠙', '⠚', '⠒', '⠂', '⠂', '⠒', '⠲', '⠴', '⠦', '⠖', '⠒', '⠐', '⠐', '⠒', '⠓', '⠋'],
      star: ['✶', '✸', '✹', '✺', '✹', '✷'],
      moon: ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'],
      clock: ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛']
    };

    this.options = {
      frames: defaultSpinners.dots,
      interval: 100,
      ...options
    };
  }

  start(text: string = ''): void {
    if (this.isSpinning) return;

    this.isSpinning = true;
    this.interval = setInterval(() => {
      this.render(text);
    }, this.options.interval);
  }

  stop(finalText?: string): string {
    if (!this.isSpinning) return '';

    this.isSpinning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    // Clear spinner and show final text
    const output = finalText || this.lastRender.replace(/^[^\s]+/, TerminalColors.success('✓'));
    return `\r${TerminalColors.clearLine()}${output}\n`;
  }

  succeed(text: string): string {
    return this.stop(`${TerminalColors.success('✓')} ${text}`);
  }

  fail(text: string): string {
    return this.stop(`${TerminalColors.error('✗')} ${text}`);
  }

  warn(text: string): string {
    return this.stop(`${TerminalColors.warning('⚠')} ${text}`);
  }

  info(text: string): string {
    return this.stop(`${TerminalColors.info('ℹ')} ${text}`);
  }

  private render(text: string): void {
    const frame = this.options.frames[this.currentFrame];
    const coloredFrame = this.options.color ? TerminalColors.colorize(frame, this.options.color) : frame;
    const output = `${coloredFrame} ${text}`;

    // Use carriage return to overwrite the line
    process.stdout.write(`\r${TerminalColors.clearLine()}${output}`);
    this.lastRender = output;

    this.currentFrame = (this.currentFrame + 1) % this.options.frames.length;
  }

  getLastRender(): string {
    return this.lastRender;
  }
}

export class MultiProgress {
  private bars: Map<string, ProgressBar> = new Map();
  private maxHeight = 0;

  addBar(id: string, label: string, options?: Partial<ProgressBarOptions>): void {
    this.bars.set(id, new ProgressBar(options));
    this.maxHeight = Math.max(this.maxHeight, this.bars.size);
  }

  update(id: string, current: number, total: number): void {
    const bar = this.bars.get(id);
    if (!bar) return;

    const progress = bar.update(current, total);
    this.render();
  }

  removeBar(id: string): void {
    this.bars.delete(id);
    this.render();
  }

  complete(id: string): void {
    const bar = this.bars.get(id);
    if (!bar) return;

    bar.complete();
    this.render();
  }

  private render(): void {
    // Clear the entire multi-progress area
    for (let i = 0; i < this.maxHeight; i++) {
      process.stdout.write('\x1b[1F\x1b[2K');
    }

    // Render all bars
    this.bars.forEach((bar, id) => {
      console.log(bar.getLastRender());
    });
  }
}

export class StepProgress {
  private steps: string[] = [];
  private currentStep = 0;
  private completedSteps = new Set<number>();

  constructor(steps: string[]) {
    this.steps = steps;
  }

  start(): void {
    this.render();
  }

  next(): void {
    if (this.currentStep < this.steps.length) {
      this.completedSteps.add(this.currentStep);
      this.currentStep++;
      this.render();
    }
  }

  complete(): void {
    for (let i = this.currentStep; i < this.steps.length; i++) {
      this.completedSteps.add(i);
    }
    this.currentStep = this.steps.length;
    this.render();
  }

  setCurrentStep(step: number): void {
    if (step >= 0 && step < this.steps.length) {
      this.currentStep = step;
      this.render();
    }
  }

  private render(): void {
    // Clear previous render
    for (let i = 0; i < this.steps.length; i++) {
      process.stdout.write('\x1b[1F\x1b[2K');
    }

    this.steps.forEach((step, index) => {
      let icon = ' ';
      let coloredStep = TerminalColors.muted(step);

      if (this.completedSteps.has(index)) {
        icon = TerminalColors.success('✓');
        coloredStep = TerminalColors.secondary(step);
      } else if (index === this.currentStep) {
        icon = TerminalColors.info('⟳');
        coloredStep = TerminalColors.primary(step);
      }

      console.log(`${icon} ${coloredStep}`);
    });
  }
}

export class LoadingBar {
  private patterns = {
    wave: ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃', '▂'],
    dots: ['⠁', '⠂', '⠄', '⡀', '⡄', '⠂', '⠈', '⠐', '⠠', '⡀', '⠄', '⠂', '⠁'],
    lines: ['-', '=', '≡'],
    blocks: ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '█', '▉', '▊', '▋', '▌', '▍', '▎', '▏'],
    pulse: ['░', '▒', '▓', '█', '▓', '▒', '░']
  };

  private currentPattern = 'wave';
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private width = 40;

  constructor(width: number = 40, pattern: keyof typeof this.patterns = 'wave') {
    this.width = width;
    this.currentPattern = pattern;
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    let offset = 0;

    this.interval = setInterval(() => {
      this.render(offset);
      offset = (offset + 1) % this.patterns[this.currentPattern].length;
    }, 100);
  }

  stop(): void {
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write('\n');
  }

  private render(offset: number): void {
    const pattern = this.patterns[this.currentPattern];
    const patternLength = pattern.length;
    const bar = [];

    for (let i = 0; i < this.width; i++) {
      const patternIndex = (i + offset) % patternLength;
      const char = pattern[patternIndex];
      bar.push(TerminalColors.info(char));
    }

    process.stdout.write(`\r[${bar.join('')}] Loading...`);
  }
}

// Utility functions
export const createSpinner = (type?: keyof typeof Spinner.prototype.constructor['prototype']['options']['frames']): Spinner => {
  const spinnerTypes = {
    dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    line: ['-', '\\', '|', '/'],
    arrow: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
    square: ['◐', '◓', '◑', '◒'],
    circle: ['◴', '◷', '◶', '◵']
  };

  return new Spinner({
    frames: type ? spinnerTypes[type] : spinnerTypes.dots
  });
};

export const createProgressBar = (width: number = 40): ProgressBar => {
  return new ProgressBar({ width });
};

export const withProgress = async <T>(
  task: () => Promise<T>,
  message: string = 'Processing...'
): Promise<T> => {
  const spinner = createSpinner();
  spinner.start(message);

  try {
    const result = await task();
    spinner.succeed(`${message} completed`);
    return result;
  } catch (error) {
    spinner.fail(`${message} failed`);
    throw error;
  }
};