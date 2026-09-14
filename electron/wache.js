'use strict';

const { fetchCatalog } = require('./catalog');
const { getSettings, setSettings, getLibrary } = require('./store');
const { compareVersions } = require('./installer');

const KATALOG_TAKT = 15 * 60 * 1000;

function restzeit(game) {
  const roh = game && game.releaseAt;
  if (!roh) return null;

  const nur = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(roh));
  const ziel = nur
    ? new Date(Number(nur[1]), Number(nur[2]) - 1, Number(nur[3]))
    : new Date(roh);
  if (Number.isNaN(ziel.getTime())) return null;

  const ms = ziel.getTime() - Date.now();

  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const tag = new Date(ziel);
  tag.setHours(0, 0, 0, 0);
  const tage = Math.round((tag - heute) / 86400000);

  return { ziel, ms, tage, vorbei: nur ? tage < 0 : ms <= 0 };
}

function zustand(game, bibliothek) {
  const installiert = bibliothek[game.id];
  if (!installiert && !(game.download && game.download.url)) return 'soon';
  if (!installiert) return 'available';
  if (compareVersions(installiert.version, game.version) < 0) return 'update';
  return 'installed';
}

class Wache {
  constructor({ melden, katalogFertig, einreihen }) {
    this.melden = melden;
    this.katalogFertig = katalogFertig;
    this.einreihen = einreihen;

    this.gemeldeteUpdates = new Set();
    this.erschienen = new Set();
    this.termine = new Set();
    this.warAngekuendigt = new Set();

    this.uhr = null;
    this.laufend = null;
    this.katalog = null;
    this.geholtAm = 0;
  }

  starten() {
    if (this.uhr) return;
    this.pruefen({ erstesMal: true });
    this.uhr = setInterval(() => this.pruefen(), KATALOG_TAKT);
    if (this.uhr.unref) this.uhr.unref();
  }

  stoppen() {
    if (!this.uhr) return;
    clearInterval(this.uhr);
    this.uhr = null;
  }

  async holen({ force = false } = {}) {
    if (!force && this.katalog && Date.now() - this.geholtAm < 60000) return this.katalog;
    const k = await this.pruefen();
    if (!k) throw new Error('Katalog konnte nicht geladen werden.');
    return k;
  }

  pruefen(opt) {
    if (this.laufend) return this.laufend;
    this.laufend = this.durchgang(opt || {}).finally(() => {
      this.laufend = null;
    });
    return this.laufend;
  }

  async durchgang({ erstesMal = false } = {}) {
    try {
      const katalog = await fetchCatalog();
      this.katalog = katalog;
      this.geholtAm = Date.now();
      this.auswerten(katalog, erstesMal);
      if (this.katalogFertig) this.katalogFertig(katalog);
      return katalog;
    } catch (err) {
      console.error('[wache]', err.message);
      return this.katalog;
    }
  }

  auswerten(katalog, erstesMal) {
    const spiele = katalog.games || [];
    const bibliothek = getLibrary();
    const einstellungen = getSettings();

    const gesehen = new Set(einstellungen.gesehenSpiele || []);
    const neu = spiele.filter((g) => !gesehen.has(g.id));
    if (neu.length) {
      if (!(erstesMal && gesehen.size === 0)) {
        this.sagen(
          neu.length === 1 ? 'notify.newGame' : 'notify.newGames',
          { title: neu[0].title, n: neu.length },
          'success'
        );
      }
      setSettings({ gesehenSpiele: spiele.map((g) => g.id) });
    }

    for (const g of spiele) {
      const angekuendigt = zustand(g, bibliothek) === 'soon';

      if (!angekuendigt && this.warAngekuendigt.has(g.id) && !this.erschienen.has(g.id)) {
        this.erschienen.add(g.id);
        this.sagen('notify.released', { title: g.title }, 'success');
      }
      if (angekuendigt) this.warAngekuendigt.add(g.id);
      else this.warAngekuendigt.delete(g.id);

      if (!angekuendigt) continue;
      const r = restzeit(g);
      if (!r || r.vorbei || r.tage > 1) continue;

      const schluessel = g.id + '@' + r.tage;
      if (this.termine.has(schluessel)) continue;
      this.termine.add(schluessel);
      if (!erstesMal || r.tage === 0) {
        this.sagen(r.tage === 1 ? 'notify.soonTomorrow' : 'notify.soonToday', { title: g.title });
      }
    }

    const offen = spiele.filter((g) => zustand(g, bibliothek) === 'update');
    if (!offen.length) return;

    if (einstellungen.autoUpdateGames && this.einreihen) {
      for (const g of offen) {
        try {
          this.einreihen(g);
        } catch (err) {
          console.error('[wache]', err.message);
        }
      }
      this.sagen('toast.autoUpdates', { n: offen.length }, 'success');
      return;
    }

    const frisch = offen.filter((g) => !this.gemeldeteUpdates.has(g.id + '@' + g.version));
    if (!frisch.length) return;
    for (const g of frisch) this.gemeldeteUpdates.add(g.id + '@' + g.version);

    this.sagen(
      offen.length === 1 ? 'notify.gameUpdate' : 'notify.gameUpdates',
      { title: offen[0].title, n: offen.length },
      'success'
    );
  }

  sagen(key, vars, kind = 'info') {
    if (getSettings().updateHinweise === false) return;
    if (this.melden) this.melden({ key, vars, kind });
  }
}

module.exports = { Wache, restzeit, zustand };
