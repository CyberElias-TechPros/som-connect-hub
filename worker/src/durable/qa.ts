// Durable Object for live Q&A session coordination
export class QASessionDurableObject {
  state: DurableObjectState;
  env: any;
  sessions: Map<string, { questions: any[], participants: Set<string> }> = new Map();

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/join' && request.method === 'POST') {
      const { sessionId, userId } = await request.json() as any;
      if (!this.sessions.has(sessionId)) {
        this.sessions.set(sessionId, { questions: [], participants: new Set() });
      }
      this.sessions.get(sessionId)!.participants.add(userId);
      return new Response(JSON.stringify({ joined: true, participants: this.sessions.get(sessionId)!.participants.size }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/leave' && request.method === 'POST') {
      const { sessionId, userId } = await request.json() as any;
      this.sessions.get(sessionId)?.participants.delete(userId);
      return new Response(JSON.stringify({ left: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/stats' && request.method === 'GET') {
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId) return new Response('Missing sessionId', { status: 400 });
      const sess = this.sessions.get(sessionId);
      return new Response(JSON.stringify({
        participants: sess?.participants.size || 0,
        questions: sess?.questions.length || 0,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  }
}
