/**
 * Real-time event listener for FixIt using Server-Sent Events (SSE)
 */

class RealtimeService {
  constructor() {
    this.eventSource = null;
    this.listeners = new Map(); // eventName -> Set(callbacks)
    this.isConnected = false;
  }

  connect() {
    if (this.eventSource) return;

    const token = localStorage.getItem('token') || '';
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const sseUrl = `${baseUrl.replace(/\/api\/?$/, '')}/api/events?token=${encodeURIComponent(token)}`;

    try {
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        this.isConnected = true;
      };

      this.eventSource.onerror = () => {
        this.isConnected = false;
        // EventSource will automatically retry connecting
      };

      // Register standard broadcast event types
      const eventTypes = [
        'issue_created',
        'issue_assigned',
        'work_started',
        'work_completed',
        'issue_reopened',
        'issue_updated',
        'issue_deleted',
        'assignment_failed',
        'worker_updated',
        'worker_created',
        'safety_alert',
        'notification',
      ];

      eventTypes.forEach((eventType) => {
        this.eventSource.addEventListener(eventType, (e) => {
          try {
            const data = JSON.parse(e.data);
            this.emit(eventType, data);
          } catch (err) {
            console.error(`Error parsing SSE ${eventType}:`, err);
          }
        });
      });
    } catch (err) {
      console.warn('Realtime SSE connection failed, falling back to polling.', err);
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
    }
  }

  subscribe(eventName, callback) {
    if (!this.eventSource) {
      this.connect();
    }
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(callback);

    // Return cleanup unsubscribe function
    return () => {
      const set = this.listeners.get(eventName);
      if (set) {
        set.delete(callback);
      }
    };
  }

  emit(eventName, data) {
    const set = this.listeners.get(eventName);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in realtime callback for ${eventName}:`, err);
        }
      });
    }
  }
}

const realtime = new RealtimeService();
export default realtime;
