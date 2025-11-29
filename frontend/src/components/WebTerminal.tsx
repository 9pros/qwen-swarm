import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import { SerializeAddon } from 'xterm-addon-serialize';
import 'xterm/css/xterm.css';
import { socketService } from '../services/websocket';

interface WebTerminalProps {
  theme?: 'light' | 'dark';
  fontSize?: number;
  fontFamily?: string;
  enableWebGL?: boolean;
  cols?: number;
  rows?: number;
  onCommand?: (command: string, args: string[]) => void;
  onOutput?: (data: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

interface TerminalHistory {
  command: string;
  timestamp: Date;
  exitCode?: number;
  duration?: number;
}

interface TerminalSession {
  id: string;
  startTime: Date;
  history: TerminalHistory[];
  bookmarks: string[];
  environment: Record<string, string>;
}

export const WebTerminal: React.FC<WebTerminalProps> = ({
  theme = 'dark',
  fontSize = 14,
  fontFamily = '"Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
  enableWebGL = true,
  cols = 80,
  rows = 24,
  onCommand,
  onOutput,
  className = '',
  style = {}
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentCommand, setCurrentCommand] = useState('');
  const [session, setSession] = useState<TerminalSession>({
    id: generateSessionId(),
    startTime: new Date(),
    history: [],
    bookmarks: [],
    environment: {}
  });

  // Generate session ID
  function generateSessionId(): string {
    return `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    const terminal = new Terminal({
      cols,
      rows,
      fontSize,
      fontFamily,
      theme: getTerminalTheme(theme),
      allowTransparency: false,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 1000,
      tabStopWidth: 4,
      wordWrap: true,
      convertEol: true,
      rendererType: enableWebGL ? 'webgl' : 'dom',
      rightClickSelectsWord: true,
      cols: 80,
      rows: 24
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();
    const serializeAddon = new SerializeAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.loadAddon(searchAddon);
    terminal.loadAddon(serializeAddon);

    // Store references
    terminalInstanceRef.current = terminal;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    // Mount terminal
    terminal.open(terminalRef.current);
    fitAddon.fit();

    // Setup custom data handler for command processing
    let commandBuffer = '';
    let isInCommand = false;

    terminal.onData((data) => {
      // Handle special keys
      if (data === '\r' || data === '\n') {
        if (commandBuffer.trim()) {
          handleCommand(commandBuffer);
          commandBuffer = '';
        } else {
          terminal.write('\r\n');
        }
        isInCommand = false;
      } else if (data === '\x7f' || data === '\b') {
        // Backspace
        if (commandBuffer.length > 0) {
          commandBuffer = commandBuffer.slice(0, -1);
          terminal.write('\b \b');
        }
      } else if (data === '\x1b[A') {
        // Up arrow - command history
        // Implement history navigation
      } else if (data === '\x1b[B') {
        // Down arrow - command history
      } else if (data === '\t') {
        // Tab completion
        // Implement tab completion
      } else if (data >= ' ' || data === '\t') {
        // Regular character
        commandBuffer += data;
        terminal.write(data);
      }
    });

    // Handle terminal resize
    const handleResize = () => {
      if (fitAddon) {
        fitAddon.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    // Initial welcome message
    terminal.writeln('\x1b[32m🐝 Welcome to Qwen Swarm Enhanced Terminal\x1b[0m');
    terminal.writeln('\x1b[36mType "help" for available commands or use Ctrl+C to exit\x1b[0m');
    terminal.writeln('');
    terminal.write('\x1b[32mqwen-swarm>\x1b[0m ');

    return () => {
      terminal.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [theme, fontSize, fontFamily, enableWebGL]);

  // WebSocket connection for remote terminal
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        await socketService.connect();
        setIsConnected(true);

        // Listen for terminal output
        socketService.on('terminal:output', (data: string) => {
          if (terminalInstanceRef.current) {
            terminalInstanceRef.current.write(data);
          }
          onOutput?.(data);
        });

        // Listen for terminal commands
        socketService.on('terminal:command', async (command: string) => {
          if (terminalInstanceRef.current) {
            terminalInstanceRef.current.writeln(`\r\n\x1b[33m[Remote]\x1b[0m ${command}`);
          }
          await handleCommand(command);
        });

        // Listen for session events
        socketService.on('terminal:session', (sessionData: any) => {
          setSession(prev => ({ ...prev, ...sessionData }));
        });

      } catch (error) {
        console.error('Failed to connect WebSocket for terminal:', error);
        setIsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      socketService.disconnect();
    };
  }, [onOutput]);

  // Command handling
  const handleCommand = useCallback(async (command: string) => {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) return;

    // Add to history
    const startTime = Date.now();
    setSession(prev => ({
      ...prev,
      history: [...prev.history, { command, timestamp: new Date() }]
    }));

    // Write command to terminal
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.writeln('');
    }

    // Parse command and arguments
    const [cmd, ...args] = trimmedCommand.split(' ');

    try {
      // Call parent command handler
      if (onCommand) {
        await onCommand(trimmedCommand, args);
      }

      // Send command via WebSocket if connected
      if (isConnected) {
        socketService.emit('terminal:command', { command: trimmedCommand, args });
      }

      // Handle built-in commands
      await handleBuiltinCommand(cmd, args);

      // Update history with success
      const duration = Date.now() - startTime;
      setSession(prev => ({
        ...prev,
        history: prev.history.map((h, i) =>
          i === prev.history.length - 1
            ? { ...h, exitCode: 0, duration }
            : h
        )
      }));

    } catch (error) {
      // Show error in terminal
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.writeln(
          `\x1b[31mError: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m`
        );
      }

      // Update history with error
      const duration = Date.now() - startTime;
      setSession(prev => ({
        ...prev,
        history: prev.history.map((h, i) =>
          i === prev.history.length - 1
            ? { ...h, exitCode: 1, duration }
            : h
        )
      }));
    }

    // Show new prompt
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.write('\x1b[32mqwen-swarm>\x1b[0m ');
    }
  }, [onCommand, isConnected]);

  // Built-in command handlers
  const handleBuiltinCommand = async (cmd: string, args: string[]): Promise<void> => {
    const terminal = terminalInstanceRef.current;
    if (!terminal) return;

    switch (cmd) {
      case 'help':
        terminal.writeln('\x1b[36mAvailable commands:\x1b[0m');
        terminal.writeln('  \x1b[32mdashboard\x1b[0m     - Show real-time swarm dashboard');
        terminal.writeln('  \x1b[32magents\x1b[0m        - List and manage agents');
        terminal.writeln('  \x1b[32mtasks\x1b[0m         - List and manage tasks');
        terminal.writeln('  \x1b[32mmetrics\x1b[0m       - Show system metrics');
        terminal.writeln('  \x1b[32mstatus\x1b[0m        - Show system status');
        terminal.writeln('  \x1b[32mlogs\x1b[0m          - View system logs');
        terminal.writeln('  \x1b[32mconfig\x1b[0m        - Manage configuration');
        terminal.writeln('  \x1b[32mclear\x1b[0m         - Clear terminal');
        terminal.writeln('  \x1b[32mhistory\x1b[0m       - Show command history');
        terminal.writeln('  \x1b[32mexport\x1b[0m        - Export session data');
        terminal.writeln('  \x1b[32mexit\x1b[0m          - Exit terminal');
        break;

      case 'clear':
        terminal.clear();
        break;

      case 'history':
        const history = session.history.slice(-10);
        if (history.length === 0) {
          terminal.writeln('\x1b[90mNo command history\x1b[0m');
        } else {
          terminal.writeln('\x1b[36mRecent commands:\x1b[0m');
          history.forEach((h, i) => {
            const status = h.exitCode === 0 ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
            terminal.writeln(`  ${status} ${h.command}`);
          });
        }
        break;

      case 'export':
        const exportData = {
          session: {
            id: session.id,
            startTime: session.startTime,
            history: session.history
          },
          timestamp: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `terminal-session-${session.id}.json`;
        a.click();
        URL.revokeObjectURL(url);

        terminal.writeln('\x1b[32mSession exported successfully\x1b[0m');
        break;

      case 'exit':
        terminal.writeln('\x1b[33mGoodbye!\x1b[0m');
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.writeln('');
        }
        break;

      default:
        // If not a built-in command, let it be handled by the backend
        break;
    }
  };

  // Utility methods
  const getTerminalTheme = (theme: 'light' | 'dark') => {
    if (theme === 'light') {
      return {
        background: '#ffffff',
        foreground: '#333333',
        cursor: '#333333',
        selection: '#b3d4fc',
        black: '#000000',
        red: '#cb3c33',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#ffffff',
        brightBlack: '#666666',
        brightRed: '#cb3c33',
        brightGreen: '#14cc02',
        brightYellow: '#e5e500',
        brightBlue: '#3b8eea',
        brightMagenta: '#bc3fbc',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      };
    } else {
      return {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selection: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      };
    }
  };

  // Public API methods
  const write = (data: string) => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.write(data);
    }
  };

  const writeln = (data: string) => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.writeln(data);
    }
  };

  const clear = () => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.clear();
    }
  };

  const resize = (cols: number, rows: number) => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.resize(cols, rows);
    }
  };

  const focus = () => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.focus();
    }
  };

  // Expose methods via ref
  React.useImperativeHandle(React.useRef(), () => ({
    write,
    writeln,
    clear,
    resize,
    focus,
    terminal: terminalInstanceRef.current,
    session
  }));

  return (
    <div className={`web-terminal ${className}`} style={style}>
      <div className="terminal-header">
        <div className="terminal-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <div className="terminal-actions">
          <button onClick={() => clear()} title="Clear Terminal">
            Clear
          </button>
          <button onClick={() => focus()} title="Focus Terminal">
            Focus
          </button>
          <button onClick={() => {
            if (searchAddonRef.current) {
              searchAddonRef.current.findNext('');
            }
          }} title="Search">
            Search
          </button>
        </div>
      </div>
      <div
        ref={terminalRef}
        className="terminal-container"
        style={{
          height: '100%',
          width: '100%',
          backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff'
        }}
      />
      <style jsx>{`
        .web-terminal {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          overflow: hidden;
        }

        .terminal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: ${theme === 'dark' ? '#2d2d2d' : '#f5f5f5'};
          border-bottom: 1px solid #e1e5e9;
        }

        .terminal-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: ${theme === 'dark' ? '#d4d4d4' : '#333333'};
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #dc3545;
        }

        .status-indicator.connected {
          background: #28a745;
        }

        .terminal-actions {
          display: flex;
          gap: 4px;
        }

        .terminal-actions button {
          padding: 4px 8px;
          border: 1px solid #e1e5e9;
          background: ${theme === 'dark' ? '#3c3c3c' : '#ffffff'};
          color: ${theme === 'dark' ? '#d4d4d4' : '#333333'};
          border-radius: 4px;
          font-size: 11px;
          cursor: pointer;
        }

        .terminal-actions button:hover {
          background: ${theme === 'dark' ? '#4c4c4c' : '#f0f0f0'};
        }

        .terminal-container {
          flex: 1;
          overflow: hidden;
        }

        :global(.xterm) {
          height: 100%;
          font-feature-settings: "liga" 0;
          position: relative;
          user-select: none;
          -ms-user-select: none;
          -webkit-user-select: none;
        }

        :global(.xterm.focus),
        :global(.xterm:focus) {
          outline: none;
        }

        :global(.xterm .xterm-viewport) {
          background-color: transparent;
          overflow-y: scroll;
          cursor: default;
          position: absolute;
          right: 0;
          left: 0;
          top: 0;
          bottom: 0;
        }

        :global(.xterm .xterm-screen) {
          position: relative;
        }

        :global(.xterm .xterm-screen canvas) {
          position: absolute;
          left: 0;
          top: 0;
        }

        :global(.xterm .xterm-scroll-area) {
          visibility: hidden;
        }

        :global(.xterm-char-measure-element) {
          display: inline-block;
          visibility: hidden;
          position: absolute;
          top: 0;
          left: -9999em;
          line-height: normal;
        }

        :global(.xterm.enable-mouse-events) {
          cursor: default;
        }

        :global(.xterm.xterm-cursor-pointer) {
          cursor: pointer;
        }

        :global(.xterm.column-select.focus) {
          cursor: crosshair;
        }

        :global(.xterm .xterm-accessibility),
        :global(.xterm .xterm-message) {
          position: absolute;
          left: 0;
          bottom: 0;
          right: 0;
          padding: 10px;
          color: #ffffff;
          background: #000000;
          font-size: 14px;
          z-index: 10;
        }

        :global(.xterm .live-region) {
          position: absolute;
          left: -9999px;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};