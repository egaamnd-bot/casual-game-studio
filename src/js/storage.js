// Best score in local storage. Storage can be unavailable, so every call is guarded.
Pulse.Storage = {
  KEY: 'pulse.best',

  getBest() {
    try {
      return parseInt(window.localStorage.getItem(this.KEY), 10) || 0;
    } catch (e) {
      return 0;
    }
  },

  setBest(score) {
    try {
      window.localStorage.setItem(this.KEY, String(score));
    } catch (e) {
      // Best score just won't persist this session.
    }
  },
};
