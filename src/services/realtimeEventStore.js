class RealtimeEventStore {
  constructor() {
    this.events = new Map();
  }

  addEvent(eventKey, event) {
    const existing = this.events.get(eventKey) || [];
    existing.push(event);
    this.events.set(eventKey, existing.slice(-20));
  }

  getEvents(eventKey, since = 0) {
    const entries = this.events.get(eventKey) || [];
    return entries.filter((event) => event.sequence > since);
  }

  clear(eventKey) {
    this.events.delete(eventKey);
  }
}

const createRealtimeEventStore = () => new RealtimeEventStore();

module.exports = {
  RealtimeEventStore,
  createRealtimeEventStore
};
