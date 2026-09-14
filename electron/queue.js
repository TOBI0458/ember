'use strict';

const { installGame } = require('./installer');

class DownloadQueue {
  constructor(emit) {
    this.emit = emit;
    this.items = new Map();
    this.order = [];
    this.activeId = null;
    this.controller = null;
  }

  snapshot() {
    return this.order
      .map((id) => this.items.get(id))
      .filter(Boolean)
      .map((item) => ({
        gameId: item.game.id,
        title: item.game.title,
        version: item.game.version,
        state: item.state,
        stage: item.stage,
        percent: item.percent,
        received: item.received,
        total: item.total,
        speedBytesPerSecond: item.speedBytesPerSecond,
        error: item.error || null
      }));
  }

  publish() {
    this.emit('queue:changed', this.snapshot());
  }

  add(game) {
    if (this.items.has(game.id)) return this.snapshot();
    this.items.set(game.id, {
      game,
      state: 'queued',
      stage: 'queued',
      percent: 0,
      received: 0,
      total: game.sizeBytes || 0,
      speedBytesPerSecond: 0
    });
    this.order.push(game.id);
    this.publish();
    this.pump();
    return this.snapshot();
  }

  cancel(gameId) {
    const item = this.items.get(gameId);
    if (!item) return;
    if (this.activeId === gameId && this.controller) {
      this.controller.abort();
      return;
    }
    this.items.delete(gameId);
    this.order = this.order.filter((id) => id !== gameId);
    this.publish();
  }

  remove(gameId) {
    this.items.delete(gameId);
    this.order = this.order.filter((id) => id !== gameId);
    this.publish();
  }

  async pump() {
    if (this.activeId) return;
    const nextId = this.order.find((id) => this.items.get(id)?.state === 'queued');
    if (!nextId) return;

    const item = this.items.get(nextId);
    this.activeId = nextId;
    this.controller = new AbortController();
    item.state = 'active';
    this.publish();

    try {
      const entry = await installGame(item.game, {
        signal: this.controller.signal,
        onStage: (progress) => {
          Object.assign(item, progress);
          this.publish();
        }
      });
      this.items.delete(nextId);
      this.order = this.order.filter((id) => id !== nextId);
      this.emit('library:changed', { gameId: nextId, entry });
    } catch (err) {
      if (err.message === 'ABORTED') {
        this.items.delete(nextId);
        this.order = this.order.filter((id) => id !== nextId);
      } else {
        item.state = 'error';
        item.stage = 'error';
        item.error = err.message;
      }
    } finally {
      this.activeId = null;
      this.controller = null;
      this.publish();
      this.pump();
    }
  }
}

module.exports = { DownloadQueue };
