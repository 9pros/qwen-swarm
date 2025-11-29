/**
 * Terminal output formatting utilities
 */

import { TerminalColors } from './colors';
import type { TableColumn, TableOptions, BoxOptions, BorderStyle } from '../types';

export class TerminalFormatters {
  // Format duration in human-readable format
  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;

    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;

    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  // Format bytes in human-readable format
  static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  // Format percentage with color
  static formatPercentage(value: number, total: number): string {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    const formatted = `${percentage.toFixed(1)}%`;

    if (percentage >= 90) return TerminalColors.error(formatted);
    if (percentage >= 70) return TerminalColors.warning(formatted);
    if (percentage >= 40) return TerminalColors.info(formatted);
    return TerminalColors.success(formatted);
  }

  // Format date relative to now
  static formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    if (diffMs < 1000) return TerminalColors.success('just now');
    if (diffMs < 60000) return TerminalColors.info(`${Math.floor(diffMs / 1000)}s ago`);
    if (diffMs < 3600000) return TerminalColors.info(`${Math.floor(diffMs / 60000)}m ago`);
    if (diffMs < 86400000) return TerminalColors.warning(`${Math.floor(diffMs / 3600000)}h ago`);

    return TerminalColors.muted(date.toLocaleDateString());
  }

  // Create padded text
  static padText(text: string, width: number, align: 'left' | 'center' | 'right' = 'left'): string {
    if (text.length >= width) return text.substring(0, width);

    const padding = width - text.length;

    switch (align) {
      case 'left':
        return text + ' '.repeat(padding);
      case 'right':
        return ' '.repeat(padding) + text;
      case 'center':
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
    }
  }

  // Truncate text with ellipsis
  static truncateText(text: string, maxLength: number, suffix = '...'): string {
    if (text.length <= maxLength) return text;

    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  // Format table
  static formatTable(data: any[], columns: TableColumn[], options: TableOptions = {
    headers: true,
    borders: true,
    padding: 1
  }): string {
    if (data.length === 0) return TerminalColors.muted('No data to display');

    // Calculate column widths
    const colWidths = columns.map(col => {
      const headerWidth = col.header.length;
      const maxDataWidth = Math.max(
        ...data.map(row => {
          const value = this.getNestedValue(row, col.key);
          const formatted = col.format ? col.format(value) : String(value);
          return TerminalColors.stripColors(formatted).length;
        })
      );
      return col.width || Math.max(headerWidth, maxDataWidth);
    });

    const pad = ' '.repeat(options.padding);
    let output = '';

    // Add headers
    if (options.headers) {
      const headerRow = columns.map((col, index) => {
        const header = TerminalColors.bold(col.header);
        return this.padText(header, colWidths[index], col.align || 'left');
      }).join(pad);

      if (options.borders) {
        const border = this.createTableBorder(colWidths, options.padding, 'top');
        output += border + '\n';
        output += `│${pad}${headerRow}${pad}│\n`;
        output += this.createTableBorder(colWidths, options.padding, 'middle') + '\n';
      } else {
        output += headerRow + '\n';
        output += '-'.repeat(headerRow.length) + '\n';
      }
    }

    // Add data rows
    data.forEach(row => {
      const rowData = columns.map((col, index) => {
        const value = this.getNestedValue(row, col.key);
        let formatted = col.format ? col.format(value) : String(value);

        // Apply color if specified
        if (col.color) {
          formatted = col.color(value) ? TerminalColors.themed(formatted, col.color(value) as any) : formatted;
        }

        return this.padText(formatted, colWidths[index], col.align || 'left');
      }).join(pad);

      if (options.borders) {
        output += `│${pad}${rowData}${pad}│\n`;
      } else {
        output += rowData + '\n';
      }
    });

    // Add bottom border
    if (options.borders) {
      output += this.createTableBorder(colWidths, options.padding, 'bottom');
    }

    return output;
  }

  // Helper to get nested object values
  private static getNestedValue(obj: any, key: string): any {
    return key.split('.').reduce((current, keyPart) => {
      return current?.[keyPart];
    }, obj);
  }

  // Create table border
  private static createTableBorder(widths: number[], padding: number, position: 'top' | 'middle' | 'bottom'): string {
    const pad = '─'.repeat(padding);
    const parts = widths.map(width => '─'.repeat(width));
    const line = parts.join(pad);

    if (position === 'top' || position === 'bottom') {
      return `┌─${pad}${line}${pad}─┐`;
    } else {
      return `├─${pad}${line}${pad}─┤`;
    }
  }

  // Format box around text
  static formatBox(content: string, options: BoxOptions = {
    padding: 1,
    margin: 0,
    borderStyle: 'single'
  }): string {
    const lines = content.split('\n');
    const maxLineLength = Math.max(...lines.map(line => TerminalColors.stripColors(line).length));
    const innerWidth = maxLineLength + (options.padding * 2);

    const borders = this.getBorderChars(options.borderStyle);
    const horizontalBorder = borders.horizontal.repeat(innerWidth);
    const paddingStr = ' '.repeat(options.padding);

    let result = '';

    // Top margin
    if (options.margin > 0) {
      result += '\n'.repeat(options.margin);
    }

    // Top border with title
    if (options.title) {
      const titlePadding = Math.max(0, innerWidth - options.title.length - 4);
      const leftPadding = options.titleAlign === 'center' ? Math.floor(titlePadding / 2) : 1;
      const rightPadding = innerWidth - options.title.length - leftPadding - 2;

      result += `${borders.topLeft}${borders.horizontal.repeat(leftPadding)} ${options.title} ${borders.horizontal.repeat(rightPadding)}${borders.topRight}\n`;
    } else {
      result += `${borders.topLeft}${horizontalBorder}${borders.topRight}\n`;
    }

    // Content
    lines.forEach(line => {
      const paddedLine = this.padText(line, maxLineLength);
      result += `${borders.vertical}${paddingStr}${paddedLine}${paddingStr}${borders.vertical}\n`;
    });

    // Bottom border
    result += `${borders.bottomLeft}${horizontalBorder}${borders.bottomRight}`;

    // Bottom margin
    if (options.margin > 0) {
      result += '\n'.repeat(options.margin);
    }

    return result;
  }

  // Get border characters for different styles
  private static getBorderChars(style: BorderStyle) {
    const borderStyles = {
      single: {
        topLeft: '┌',
        topRight: '┐',
        bottomLeft: '└',
        bottomRight: '┘',
        vertical: '│',
        horizontal: '─',
        leftCross: '├',
        rightCross: '┤',
        topCross: '┬',
        bottomCross: '┴',
        cross: '┼'
      },
      double: {
        topLeft: '╔',
        topRight: '╗',
        bottomLeft: '╚',
        bottomRight: '╝',
        vertical: '║',
        horizontal: '═',
        leftCross: '╠',
        rightCross: '╣',
        topCross: '╦',
        bottomCross: '╩',
        cross: '╬'
      },
      rounded: {
        topLeft: '╭',
        topRight: '╮',
        bottomLeft: '╰',
        bottomRight: '╯',
        vertical: '│',
        horizontal: '─',
        leftCross: '├',
        rightCross: '┤',
        topCross: '┬',
        bottomCross: '┴',
        cross: '┼'
      },
      bold: {
        topLeft: '┏',
        topRight: '┓',
        bottomLeft: '┗',
        bottomRight: '┛',
        vertical: '┃',
        horizontal: '━',
        leftCross: '┣',
        rightCross: '┫',
        topCross: '┳',
        bottomCross: '┻',
        cross: '╋'
      },
      dashed: {
        topLeft: '┌',
        topRight: '┐',
        bottomLeft: '└',
        bottomRight: '┘',
        vertical: '│',
        horizontal: '┈',
        leftCross: '├',
        rightCross: '┤',
        topCross: '┬',
        bottomCross: '┴',
        cross: '┼'
      },
      dotted: {
        topLeft: '┌',
        topRight: '┐',
        bottomLeft: '└',
        bottomRight: '┘',
        vertical: '│',
        horizontal: '┄',
        leftCross: '├',
        rightCross: '┤',
        topCross: '┬',
        bottomCross: '┴',
        cross: '┼'
      }
    };

    return borderStyles[style] || borderStyles.single;
  }

  // Format list
  static formatList(items: string[], options: {
    bullet?: string;
    indent?: number;
    spacing?: number;
    colorize?: boolean;
  } = {}): string {
    const {
      bullet = '•',
      indent = 2,
      spacing = 1,
      colorize = true
    } = options;

    const indentStr = ' '.repeat(indent);
    const spacingStr = '\n'.repeat(spacing);

    return items.map((item, index) => {
      let bulletStr = bullet;
      if (colorize) {
        const colors = [TerminalColors.primary, TerminalColors.info, TerminalColors.accent];
        bulletStr = colors[index % colors.length](bullet);
      }
      return `${indentStr}${bulletStr} ${item}`;
    }).join(spacingStr);
  }

  // Format code block
  static formatCode(code: string, language?: string): string {
    const maxLineLength = Math.max(...code.split('\n').map(line => line.length));
    const lineNumberWidth = code.split('\n').length.toString().length;

    let output = '';
    output += TerminalColors.secondary(`${language || 'code'}:`) + '\n';
    output += this.formatBox(code, {
      padding: 1,
      borderStyle: 'single'
    });

    return output;
  }

  // Format key-value pairs
  static formatKeyValue(pairs: Record<string, any>, options: {
    separator?: string;
    keyColor?: (key: string) => string;
    valueColor?: (value: any) => string;
    indent?: number;
  } = {}): string {
    const {
      separator = ': ',
      keyColor = TerminalColors.primary,
      valueColor = TerminalColors.info,
      indent = 0
    } = options;

    const indentStr = ' '.repeat(indent);

    return Object.entries(pairs).map(([key, value]) => {
      const formattedKey = keyColor(key);
      const formattedValue = typeof value === 'object'
        ? JSON.stringify(value, null, 2)
        : String(value);
      const coloredValue = valueColor(formattedValue);
      return `${indentStr}${formattedKey}${separator}${coloredValue}`;
    }).join('\n');
  }
}