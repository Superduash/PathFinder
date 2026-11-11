type Listener<T = any> = (data: T) => void;

export class RaceSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Map<string, Set<Listener>> = new Map();
  private pingInterval: any = null;
  private reconnectTimeout: any = null;
  private isClosedManually = false;

  constructor(url?: string) {
    if (url) {
      this.url = url;
    } else {
      const loc = window.location;
      const proto = loc.protocol === "https:" ? "wss:" : "ws:";
      // In development, use relative path which will be proxied by Vite to backend
      // In production, connect directly to backend
      if (import.meta.env.DEV) {
        // Use the frontend's host, proxy will forward to backend
        this.url = `${proto}//${loc.host}/ws/race`;
      } else {
        // In production, connect to backend on port 8000
        const host = loc.hostname;
        this.url = `${proto}//${host}:8000/ws/race`;
      }
    }
  }

  connect(): void {
    this.isClosedManually = false;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.emit("open", {});
      this.startPing();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type) {
          this.emit(msg.type, msg);
        }
        this.emit("message", msg);
      } catch (err) {
        console.error("Failed to parse websocket message", err);
      }
    };

    this.ws.onerror = (err) => {
      this.emit("error", err);
    };

    this.ws.onclose = () => {
      this.stopPing();
      this.emit("close", {});
      if (!this.isClosedManually) {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          this.connect();
        }, 1200);
      }
    };
  }

  send(data: object): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  on(type: string, fn: Listener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(fn);
    return () => this.off(type, fn);
  }

  off(type: string, fn: Listener): void {
    this.listeners.get(type)?.delete(fn);
  }

  private emit(type: string, data: any): void {
    this.listeners.get(type)?.forEach((fn) => fn(data));
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      this.send({ type: "ping" });
    }, 20000);
  }

  private stopPing(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
  }

  disconnect(): void {
    this.isClosedManually = true;
    this.stopPing();
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

