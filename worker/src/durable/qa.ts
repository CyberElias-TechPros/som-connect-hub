/**
 * SOM CONNECT — QASessionDurableObject
 *
 * One instance per Q&A session, addressed by `idFromName(sessionId)`.
 * Responsibilities:
 *  - participant presence (join / leave / stats)
 *  - live question broadcast to every connected client
 *  - WebSocket fan-out using the hibernation-friendly server API so idle
 *    sockets do not keep the object in memory.
 *
 * HTTP surface (also used by the Worker routes):
 *   POST /join    { sessionId, userId, name }
 *   POST /leave   { sessionId, userId }
 *   POST /question{ sessionId, question }
 *   POST /broadcast { sessionId, event, data }
 *   GET  /stats?sessionId=
 *   GET  /ws?sessionId=  (Upgrade: websocket)
 */

interface SessionState {
  participants: Record<string, { name: string; joinedAt: string }>;
  recentQuestions: Array<{ id: string; text: string; askedBy: string; at: string }>;
  updatedAt: string;
}

interface Attachment {
  sessionId: string;
  userId: string;
  name: string;
}

const DEFAULT_STATE: SessionState = { participants: {}, recentQuestions: [], updatedAt: new Date().toISOString() };

export class QASessionDurableObject implements DurableObject {
  private state: DurableObjectState;
  private env: unknown;

  constructor(state: DurableObjectState, env: unknown) {
    this.state = state;
    this.env = env;
  }

  private async load(): Promise<SessionState> {
    const stored = await this.state.storage.get<SessionState>('session');
    return stored ?? { ...DEFAULT_STATE, participants: {}, recentQuestions: [] };
  }

  private async save(next: SessionState): Promise<void> {
    next.updatedAt = new Date().toISOString();
    // Keep only the 50 most recent questions to bound storage growth.
    next.recentQuestions = next.recentQuestions.slice(-50);
    await this.state.storage.put('session', next);
  }

  private static json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  private broadcast(event: string, data: unknown, exclude?: WebSocket): void {
    const payload = JSON.stringify({ event, data, at: new Date().toISOString() });
    for (const socket of this.state.getWebSockets()) {
      if (socket === exclude) continue;
      try {
        socket.send(payload);
      } catch {
        /* socket already closing */
      }
    }
  }

  private count(): number {
    return this.state.getWebSockets().length;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const session = await this.load();

    /* ---------------- WebSocket channel ---------------- */
    if (path === '/ws' || request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return QASessionDurableObject.json({ error: 'WebSocket upgrade required' }, 426);
      }
      const sessionId = url.searchParams.get('sessionId') ?? 'unknown';
      const userId = url.searchParams.get('userId') ?? `anon_${crypto.randomUUID().slice(0, 8)}`;
      const name = url.searchParams.get('name') ?? 'Guest';

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

      this.state.acceptWebSocket(server, [sessionId]);
      server.serializeAttachment({ sessionId, userId, name } satisfies Attachment);

      session.participants[userId] = { name, joinedAt: new Date().toISOString() };
      await this.save(session);

      server.send(
        JSON.stringify({
          event: 'connected',
          data: {
            sessionId,
            participants: Object.keys(session.participants).length,
            sockets: this.count(),
            recentQuestions: session.recentQuestions,
          },
        }),
      );
      this.broadcast('presence', { participants: Object.keys(session.participants).length, joined: name, userId }, server);

      return new Response(null, { status: 101, webSocket: client });
    }

    /* ---------------- HTTP endpoints ---------------- */
    if (path === '/join' && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as any;
      const userId = body.userId ?? `anon_${crypto.randomUUID().slice(0, 8)}`;
      const name = body.name ?? 'Member';
      session.participants[userId] = { name, joinedAt: new Date().toISOString() };
      await this.save(session);
      const participants = Object.keys(session.participants).length;
      this.broadcast('presence', { participants, joined: name, userId });
      return QASessionDurableObject.json({
        joined: true,
        sessionId: body.sessionId ?? 'unknown',
        participants: Math.max(participants, this.count()),
        questions: session.recentQuestions.length,
      });
    }

    if (path === '/leave' && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as any;
      if (body.userId) delete session.participants[body.userId];
      await this.save(session);
      const participants = Object.keys(session.participants).length;
      this.broadcast('presence', { participants, left: body.userId });
      return QASessionDurableObject.json({ left: true, participants });
    }

    if (path === '/question' && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as any;
      const entry = {
        id: body.id ?? crypto.randomUUID(),
        text: String(body.text ?? ''),
        askedBy: String(body.askedBy ?? 'Member'),
        at: new Date().toISOString(),
      };
      session.recentQuestions.push(entry);
      await this.save(session);
      this.broadcast('question', entry);
      return QASessionDurableObject.json({ received: true, question: entry, questions: session.recentQuestions.length }, 201);
    }

    if (path === '/broadcast' && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as any;
      this.broadcast(body.event ?? 'message', body.data ?? {});
      return QASessionDurableObject.json({ broadcast: true, sockets: this.count() });
    }

    if (path === '/stats') {
      return QASessionDurableObject.json({
        sessionId: url.searchParams.get('sessionId') ?? 'unknown',
        participants: Object.keys(session.participants).length,
        sockets: this.count(),
        questions: session.recentQuestions.length,
        updatedAt: session.updatedAt,
      });
    }

    if (path === '/reset' && request.method === 'POST') {
      await this.state.storage.deleteAll();
      this.broadcast('reset', {});
      return QASessionDurableObject.json({ reset: true });
    }

    return QASessionDurableObject.json({ error: 'Not found', path }, 404);
  }

  /* Hibernation WebSocket handlers */

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;
    let parsed: any;
    try {
      parsed = JSON.parse(message);
    } catch {
      socket.send(JSON.stringify({ event: 'error', data: { message: 'Messages must be JSON' } }));
      return;
    }

    const attachment = (socket.deserializeAttachment() as Attachment | null) ?? {
      sessionId: 'unknown',
      userId: 'anon',
      name: 'Guest',
    };
    const session = await this.load();

    switch (parsed.event ?? parsed.type) {
      case 'question': {
        const entry = {
          id: crypto.randomUUID(),
          text: String(parsed.data?.text ?? parsed.text ?? ''),
          askedBy: attachment.name,
          at: new Date().toISOString(),
        };
        session.recentQuestions.push(entry);
        await this.save(session);
        this.broadcast('question', entry);
        break;
      }
      case 'reaction': {
        this.broadcast('reaction', { emoji: parsed.data?.emoji ?? '🙌', from: attachment.name });
        break;
      }
      case 'typing': {
        this.broadcast('typing', { from: attachment.name }, socket);
        break;
      }
      case 'ping': {
        socket.send(JSON.stringify({ event: 'pong', data: { at: Date.now() } }));
        break;
      }
      default: {
        socket.send(JSON.stringify({ event: 'error', data: { message: `Unknown event: ${parsed.event ?? parsed.type}` } }));
      }
    }
  }

  async webSocketClose(socket: WebSocket, code: number, reason: string): Promise<void> {
    const attachment = socket.deserializeAttachment() as Attachment | null;
    if (attachment?.userId) {
      const session = await this.load();
      delete session.participants[attachment.userId];
      await this.save(session);
      this.broadcast('presence', { participants: Object.keys(session.participants).length, left: attachment.userId });
    }
    try {
      socket.close(code, reason);
    } catch {
      /* already closed */
    }
  }

  async webSocketError(socket: WebSocket): Promise<void> {
    try {
      socket.close(1011, 'WebSocket error');
    } catch {
      /* noop */
    }
  }
}
