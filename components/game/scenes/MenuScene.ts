import Phaser from 'phaser';
import { COMPLETE, CompleteGame } from '@/lib/game/engine';
import { getBestScore, type GameMode } from '@/lib/game/storage';
import { h } from '../ui';
import { Backdrop, getCtx } from './common';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const ctx = getCtx(this);
    new Backdrop(this);

    const panel = h('div', 'sg-body is-full sg-menu');
    ctx.overlay.replaceChildren(panel);

    panel.append(h('p', 'sg-eyebrow', 'मेहफ़िल · खेल'));
    panel.append(h('h2', 'sg-title', 'शेर अंताक्षरी'));
    panel.append(h('p', 'sg-lead', 'अधूरा शेर पूरा कीजिए।'));

    const modes: Array<{ mode: GameMode; title: string; rules: string; ok: boolean }> = [
      {
        mode: 'complete',
        title: 'शेर पूरा कीजिए',
        rules: `${COMPLETE.questions} सवाल · हर सवाल ${COMPLETE.seconds} सेकंड · चार में से सही दूसरी पंक्ति चुनिए`,
        ok: CompleteGame.canPlay(ctx.entries),
      },
    ];

    const list = h('div', 'sg-modes');
    for (const m of modes) {
      const best = getBestScore(m.mode);
      const btn = h('button', 'sg-mode', undefined, { type: 'button' });
      btn.disabled = !m.ok;
      btn.append(h('span', 'sg-mode-title', m.title));
      btn.append(h('span', 'sg-mode-rules', m.ok ? m.rules : 'अभी इसके लिए पर्याप्त शेर उपलब्ध नहीं हैं।'));
      btn.append(h('span', 'sg-mode-best', best > 0 ? `सर्वश्रेष्ठ अंक: ${best}` : 'अभी कोई स्कोर नहीं'));
      btn.addEventListener('click', () => this.scene.start('Play', { mode: m.mode }));
      list.append(btn);
    }
    panel.append(list);

    if (ctx.usedFallback) {
      panel.append(
        h('p', 'sg-note', 'मेहफ़िल पर अभी शेर कम हैं, इसलिए खेल में सार्वजनिक क्षेत्र (public domain) के क्लासिकल शायरों के शेर भी शामिल हैं।'),
      );
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => panel.remove());
  }
}
