/**
 * Terminal color utilities and ANSI escape codes
 */

export class TerminalColors {
  private static supportsColor(): boolean {
    if (typeof process === 'undefined') return false;

    // Check if we're in a TTY
    if (!process.stdout.isTTY) return false;

    // Check environment variables
    const { TERM, COLORTERM } = process.env;
    if (COLORTERM) return true;
    if (TERM && TERM !== 'dumb') return true;

    // Check for common terminals that support colors
    return ['xterm', 'xterm-256color', 'screen', 'tmux'].includes(TERM || '');
  }

  private static supportsUnicode(): boolean {
    if (typeof process === 'undefined') return false;
    return process.env.LANG?.includes('UTF-8') || false;
  }

  // ANSI color codes
  static readonly ANSI = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    italic: '\x1b[3m',
    underline: '\x1b[4m',
    blink: '\x1b[5m',
    inverse: '\x1b[7m',
    hidden: '\x1b[8m',
    strikethrough: '\x1b[9m',

    // Colors
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',

    // Bright colors
    brightBlack: '\x1b[90m',
    brightRed: '\x1b[91m',
    brightGreen: '\x1b[92m',
    brightYellow: '\x1b[93m',
    brightBlue: '\x1b[94m',
    brightMagenta: '\x1b[95m',
    brightCyan: '\x1b[96m',
    brightWhite: '\x1b[97m',

    // Background colors
    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m',
  };

  static readonly themes = {
    light: {
      primary: '\x1b[34m',      // Blue
      secondary: '\x1b[90m',    // Bright black (gray)
      success: '\x1b[32m',      // Green
      warning: '\x1b[93m',      // Bright yellow
      error: '\x1b[91m',        // Bright red
      info: '\x1b[36m',         // Cyan
      muted: '\x1b[90m',        // Bright black
      background: '\x1b[47m',   // White background
      text: '\x1b[30m',         // Black
      accent: '\x1b[35m',       // Magenta
    },
    dark: {
      primary: '\x1b[94m',      // Bright blue
      secondary: '\x1b[37m',    // White
      success: '\x1b[92m',      // Bright green
      warning: '\x1b[93m',      // Bright yellow
      error: '\x1b[91m',        // Bright red
      info: '\x1b[96m',         // Bright cyan
      muted: '\x1b[90m',        // Bright black
      background: '\x1b[40m',   // Black background
      text: '\x1b[97m',         // Bright white
      accent: '\x1b[95m',       // Bright magenta
    }
  };

  private static currentTheme = 'dark';

  static setTheme(theme: 'light' | 'dark'): void {
    this.currentTheme = theme;
  }

  static getTheme() {
    return this.themes[this.currentTheme];
  }

  // Color application methods
  static colorize(text: string, color: keyof typeof this.ANSI): string {
    if (!this.supportsColor()) return text;
    return `${this.ANSI[color]}${text}${this.ANSI.reset}`;
  }

  static themed(text: string, colorType: keyof typeof this.themes.dark): string {
    if (!this.supportsColor()) return text;
    const theme = this.getTheme();
    return `${theme[colorType]}${text}${this.ANSI.reset}`;
  }

  // Convenience methods
  static primary(text: string): string { return this.themed(text, 'primary'); }
  static secondary(text: string): string { return this.themed(text, 'secondary'); }
  static success(text: string): string { return this.themed(text, 'success'); }
  static warning(text: string): string { return this.themed(text, 'warning'); }
  static error(text: string): string { return this.themed(text, 'error'); }
  static info(text: string): string { return this.themed(text, 'info'); }
  static muted(text: string): string { return this.themed(text, 'muted'); }
  static accent(text: string): string { return this.themed(text, 'accent'); }

  // Style combinations
  static bold(text: string): string { return this.colorize(text, 'bright'); }
  static dim(text: string): string { return this.colorize(text, 'dim'); }
  static italic(text: string): string { return this.colorize(text, 'italic'); }
  static underline(text: string): string { return this.colorize(text, 'underline'); }
  static strikethrough(text: string): string { return this.colorize(text, 'strikethrough'); }

  // Status color mapping
  static getStatusColor(status: string): (text: string) => string {
    const statusColors: Record<string, keyof typeof this.themes.dark> = {
      running: 'success',
      active: 'success',
      online: 'success',
      connected: 'success',

      stopped: 'muted',
      inactive: 'muted',
      offline: 'muted',
      disconnected: 'muted',

      error: 'error',
      failed: 'error',
      offline: 'error',
      critical: 'error',

      warning: 'warning',
      pending: 'warning',
      waiting: 'warning',
      loading: 'warning',

      info: 'info',
      unknown: 'info',
      default: 'secondary'
    };

    const colorType = statusColors[status.toLowerCase()] || 'secondary';
    return (text: string) => this.themed(text, colorType);
  }

  // Gradient effect (simplified)
  static gradient(text: string, startColor: string, endColor: string): string {
    if (!this.supportsColor()) return text;

    // Simple gradient implementation using alternating colors
    const chars = text.split('');
    const gradientChars = chars.map((char, index) => {
      const color = index % 2 === 0 ? startColor : endColor;
      return `${color}${char}${this.ANSI.reset}`;
    });

    return gradientChars.join('');
  }

  // Rainbow effect
  static rainbow(text: string): string {
    if (!this.supportsColor()) return text;

    const colors = [
      this.ANSI.red, this.ANSI.yellow, this.ANSI.green,
      this.ANSI.cyan, this.ANSI.blue, this.ANSI.magenta
    ];

    const chars = text.split('');
    const rainbowChars = chars.map((char, index) => {
      const color = colors[index % colors.length];
      return `${color}${char}${this.ANSI.reset}`;
    });

    return rainbowChars.join('');
  }

  // Color strip utility (for testing/compatibility)
  static stripColors(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }

  // Get terminal width and height
  static getTerminalSize(): { width: number; height: number } {
    if (typeof process === 'undefined') return { width: 80, height: 24 };

    return {
      width: process.stdout.columns || 80,
      height: process.stdout.rows || 24
    };
  }

  // Check if terminal supports specific features
  static supportsFeature(feature: 'color' | 'unicode' | 'links' | 'images'): boolean {
    switch (feature) {
      case 'color':
        return this.supportsColor();
      case 'unicode':
        return this.supportsUnicode();
      case 'links':
        return process.env.TERM_PROGRAM === 'vscode' ||
               process.env.TERM_PROGRAM === 'iTerm.app' ||
               this.supportsUnicode();
      case 'images':
        return process.env.TERM_PROGRAM === 'iTerm.app' ||
               process.env.WSL_DISTRO_NAME !== undefined;
      default:
        return false;
    }
  }

  // Create hyperlink (if supported)
  static link(text: string, url: string): string {
    if (!this.supportsFeature('links')) return text;

    // ANSI hyperlink escape sequence
    return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
  }

  // Clear screen and cursor positioning
  static clearScreen(): string {
    return '\x1b[2J\x1b[H';
  }

  static clearLine(): string {
    return '\x1b[2K';
  }

  static moveTo(x: number, y: number): string {
    return `\x1b[${y};${x}H`;
  }

  static moveUp(lines: number): string {
    return `\x1b[${lines}A`;
  }

  static moveDown(lines: number): string {
    return `\x1b[${lines}B`;
  }

  static moveLeft(columns: number): string {
    return `\x1b[${columns}D`;
  }

  static moveRight(columns: number): string {
    return `\x1b[${columns}C`;
  }

  static hideCursor(): string {
    return '\x1b[?25l';
  }

  static showCursor(): string {
    return '\x1b[?25h';
  }

  // Save/restore cursor position
  static saveCursor(): string {
    return '\x1b[s';
  }

  static restoreCursor(): string {
    return '\x1b[u';
  }
}