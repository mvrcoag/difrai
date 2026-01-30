type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

class Logger {
  private format(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ` ${args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' ')}` : '';
    return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
  }

  info(message: string, ...args: any[]): void {
    console.log(this.format('INFO', message, ...args));
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.format('WARN', message, ...args));
  }

  error(message: string, ...args: any[]): void {
    console.error(this.format('ERROR', message, ...args));
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.format('DEBUG', message, ...args));
    }
  }
}

export const logger = new Logger();
