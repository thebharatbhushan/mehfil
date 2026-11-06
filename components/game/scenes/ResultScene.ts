import Phaser from 'phaser';
import { saveBestScore, type GameMode } from '@/lib/game/storage';
import { trackGameEvent } from '@/lib/game/analytics';
import { GAME_W } from '../types';
import { prefersReducedMotion } from '../theme';
import { h } from '../ui';
import { Backdrop, getCtx, sparkBurst } from './common';

export interface ResultData {
  mode: GameMode;
  score: number;
  correct: number;
  total: number;
}

const MODE_NAME: Record<GameMode, string> = { antakshari: 'शेर पूरा कीजिए', complete: 'शेर पूरा कीजिए' };

async function shareResult(text: string, status: HTMLElement) {
  const url = `${window.location.origin}/game`;
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: 'Mehfil · शेर अंताक्षरी', text, url });
      return;
    }
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') return; // the visitor closed the share sheet
    // any other failure: fall through to copy-link
  }
  try {
    await navigator.clipboard.writeText(url);
    status.textContent = 'लिंक कॉपी हो गया!';
  } catch {
    status.textContent = `यह लिंक साझा करें: ${url}`;
  }
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(data: ResultData) {
    const ctx = getCtx(this);
    const pal = ctx.palette();
    new Backdrop(this);

    const { best, isNew } = saveBestScore(data.mode, data.score);
    trackGameEvent('game_end', { mode: data.mode, score: data.score });

    const panel = h('div', 'sg-body is-full sg-result');
    ctx.overlay.replaceChildren(panel);

    panel.append(h('p', 'sg-eyebrow', MODE_NAME[data.mode]));
    panel.append(h('h2', 'sg-title', 'खेल ख़त्म'));
    panel.append(h('p', 'sg-score-big', String(data.score), { 'aria-label': `आपके अंक ${data.score}` }));
    panel.append(h('p', 'sg-lead', `${data.total} में से ${data.correct} सही`));
    panel.append(h('p', isNew ? 'sg-best is-new' : 'sg-best', isNew ? `नया सर्वश्रेष्ठ स्कोर: ${best}` : `सर्वश्रेष्ठ स्कोर: ${best}`));

    const status = h('p', 'sg-msg', '', { role: 'status', 'aria-live': 'polite' });

    const again = h('button', 'sg-btn', 'फिर खेलें', { type: 'button' });
    again.addEventListener('click', () => this.scene.start('Play', { mode: data.mode }));
    const share = h('button', 'sg-btn is-ghost', 'शेयर करें', { type: 'button' });
    share.addEventListener('click', () => {
      void shareResult(`मैंने मेहफ़िल की "${MODE_NAME[data.mode]}" में ${data.score} अंक बनाए! क्या आप मुझे हरा सकते हैं?`, status);
    });
    const menu = h('button', 'sg-btn is-ghost', 'मुख्य मेन्यू', { type: 'button' });
    menu.addEventListener('click', () => this.scene.start('Menu'));

    const actions = h('div', 'sg-actions');
    actions.append(again, share, menu);
    panel.append(actions, status);
    again.focus({ preventScroll: true });

    if (isNew && !prefersReducedMotion()) {
      for (let i = 0; i < 4; i++) {
        this.time.delayedCall(i * 220, () => sparkBurst(this, GAME_W * (0.2 + Math.random() * 0.6), 180 + Math.random() * 120, pal.accent.n, 16));
      }
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => panel.remove());
  }
}
