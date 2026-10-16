/**
 * Real-time event broadcasting service using Server-Sent Events (SSE)
 */

class EventService {
  constructor() {
    this.clients = new Map(); // clientId -> { res, userId, role }
    this.counter = 0;
  }

  /**
   * Register a new SSE client
   */
  addClient(req, res, user = null) {
    const clientId = `client_${Date.now()}_${++this.counter}`;
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

    this.clients.set(clientId, {
      res,
      userId: user ? user.id || user._id?.toString() : null,
      role: user ? user.role : null,
    });

    req.on('close', () => {
      this.clients.delete(clientId);
    });

    return clientId;
  }

  /**
   * Broadcast an event to all connected clients or filtered by user/role
   */
  broadcast(event, data, filter = null) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    for (const [clientId, client] of this.clients.entries()) {
      try {
        if (filter) {
          if (filter.userId && client.userId !== filter.userId.toString()) {
            continue;
          }
          if (filter.role && client.role !== filter.role) {
            continue;
          }
        }
        client.res.write(payload);
      } catch (err) {
        console.error(`Error sending SSE to ${clientId}:`, err.message);
        this.clients.delete(clientId);
      }
    }
  }
}

module.exports = new EventService();
