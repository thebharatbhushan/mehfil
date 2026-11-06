import Phaser from 'phaser';
import { AntakshariGame, CompleteGame, type AnswerResult } from '@/lib/game/engine';
import type { Entry } from '@/lib/game/couplets';
import type { GameMode } from '@/lib/game/storage';
import { trackGameEvent } from '@/lib/game/analytics';
import { FONT_UI, GAME_W, THEME_EVENT } from '../types';
import { prefersReducedMotion } from '../theme';
import { h, sherCard } from '../ui';
import { Backdrop, floatText, getCtx, sparkBurst } from './common';

type Phase = 'answering' | 'feedback' | 'done';

const BAR_X = 28;
const BAR_Y = 76;
const BAR_W = GAME_W - 56;
const LOW_TIME = 5;

export class PlayScene extends Phaser.Scene {
  private mode: GameMode = 'antakshari';
  private panel!: HTMLElement;
  private phase: Phase = 'done';
  private remaining = 0;
  private total = 1;

  private antak: AntakshariGame | null = null;
  private complete: CompleteGame | null = null;

  private hudRound!: Phaser.GameObjects.Text;
  private hudScore!: Phaser.GameObjects.Text;
  private hudTime!: Phaser.GameObjects.Text;
  private hudStreak!: Phaser.GameObjects.Text;
  private bar!: Phaser.GameObjects.Graphics;
  private onTheme = () => this.paintHud();

  constructor() {
    super('Play');
  }

  init(data: { mode: GameMode }) {
    // A Phaser scene instance is reused on every restart, so reset all per-game state here.
    this.mode = data?.mode === 'complete' ? 'complete' : 'antakshari';
    this.phase = 'done';
    this.antak = null;
    this.complete = null;
    this.optionButtons = new Map();
    this.completeButtons = [];
  }

  create() {
    const ctx = getCtx(this);
    new Backdrop(this);
    const pal = ctx.palette();

    const style = (size: number, color: string, weight = '600') => ({
      fontFamily: FONT_UI,
      fontSize: `${size}px`,
      fontStyle: weight,
      color,
      resolution: 2,
      // Devanagari matras reach above/below the line box; padding stops Phaser from clipping them.
      padding: { top: 10, bottom: 10, left: 2, right: 2 },
    });
    this.hudRound = this.add.text(BAR_X, 8, '', style(22, pal.accentText.css));
    this.hudScore = this.add.text(GAME_W - BAR_X, 8, '', style(22, pal.accentText.css)).setOrigin(1, 0);
    this.hudTime = this.add.text(GAME_W / 2, 2, '', style(32, pal.text.css, '700')).setOrigin(0.5, 0);
    this.hudStreak = this.add.text(GAME_W / 2, 44, '', style(15, pal.muted.css, '500')).setOrigin(0.5, 0);
    this.bar = this.add.graphics();

    this.panel = h('div', 'sg-body sg-play');
    ctx.overlay.replaceChildren(this.panel);

    this.game.events.on(THEME_EVENT, this.onTheme);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(THEME_EVENT, this.onTheme);
      this.panel.remove();
    });

    trackGameEvent('game_start', { mode: this.mode });
    if (this.mode === 'antakshari') this.startAntakshari();
    else this.startComplete();
  }

  update(_time: number, delta: number) {
    if (this.phase !== 'answering') return;
    this.remaining = Math.max(0, this.remaining - delta / 1000);
    this.paintHud();
    if (this.remaining <= 0) this.onTimeout();
  }

  /* ------------------------------- HUD ------------------------------- */

  private score() {
    return (this.antak ?? this.complete)?.score ?? 0;
  }

  private paintHud() {
    const pal = getCtx(this).palette();
    const streak = (this.antak ?? this.complete)?.streak ?? 0;
    this.hudRound.setColor(pal.accentText.css);
    this.hudScore.setColor(pal.accentText.css).setText(`अंक ${this.score()}`);
    this.hudStreak.setColor(pal.muted.css).setText(streak >= 2 ? `लगातार ×${streak}` : '');
    const low = this.remaining <= LOW_TIME;
    this.hudTime.setColor(low && this.phase === 'answering' ? pal.bad.css : pal.text.css).setText(String(Math.ceil(this.remaining)));
    const frac = this.total > 0 ? Phaser.Math.Clamp(this.remaining / this.total, 0, 1) : 0;
    this.bar.clear();
    this.bar.fillStyle(pal.border.n, 0.7).fillRoundedRect(BAR_X, BAR_Y, BAR_W, 8, 4);
    if (frac > 0) {
      this.bar.fillStyle(low ? pal.bad.n : pal.accent.n, 1).fillRoundedRect(BAR_X, BAR_Y, Math.max(8, BAR_W * frac), 8, 4);
    }
  }

  private setRoundLabel(text: string) {
    this.hudRound.setText(text);
  }

  private startTimer(seconds: number) {
    this.total = seconds;
    this.remaining = seconds;
    this.phase = 'answering';
    this.paintHud();
  }

  private pop(object: Phaser.GameObjects.Text) {
    if (prefersReducedMotion()) return;
    this.tweens.add({ targets: object, scale: 1.25, duration: 120, yoyo: true, ease: 'Quad.easeOut' });
  }

  private reward(res: { points: number; bonus: number }) {
    const pal = getCtx(this).palette();
    sparkBurst(this, GAME_W / 2, 300, pal.accent.n);
    floatText(this, GAME_W / 2, 300, `+${res.points + res.bonus}`, pal.accentText.css, FONT_UI);
    this.pop(this.hudScore);
    this.paintHud();
  }

  private penalty() {
    if (!prefersReducedMotion()) this.cameras.main.shake(220, 0.006);
    this.paintHud();
  }

  private finish() {
    this.phase = 'done';
    const g = this.antak ?? this.complete!;
    const total = this.antak ? this.antak.rounds : this.complete!.total;
    this.scene.start('Result', { mode: this.mode, score: g.score, correct: g.correct, total });
  }

  /** "Next" button shared by both modes; focus moves to it so keyboard / screen-reader users continue naturally. */
  private nextButton(label: string, onClick: () => void): HTMLButtonElement {
    const btn = h('button', 'sg-btn', label, { type: 'button' });
    let used = false;
    btn.addEventListener('click', () => {
      if (used) return;
      used = true;
      onClick();
    });
    btn.focus({ preventScroll: true });
    return btn;
  }

  private onTimeout() {
    if (this.phase !== 'answering') return;
    if (this.antak) this.antakFail('समय समाप्त!');
    else this.completeAnswer(-1);
  }

  /* --------------------------- Mode 1: Antakshari --------------------------- */

  private startAntakshari() {
    const ctx = getCtx(this);
    this.antak = new AntakshariGame(ctx.entries);
    if (!this.antak.begin()) {
      this.finish();
      return;
    }
    this.antakRound();
  }

  private optionButtons = new Map<string, HTMLButtonElement>();
  private msg!: HTMLElement;

  private antakRound() {
    const g = this.antak!;
    this.setRoundLabel(`राउंड ${g.round}/${g.rounds}`);
    this.startTimer(g.seconds);
    this.optionButtons.clear();

    const panel = this.panel;
    panel.replaceChildren();
    panel.append(h('p', 'sg-label', 'कंप्यूटर का शेर'));
    panel.append(sherCard(g.current));
    const need = h('p', 'sg-need');
    need.append('अगला शेर इस अक्षर से शुरू होना चाहिए: ', h('strong', 'sg-akshar', g.required));
    panel.append(need);

    const list = h('div', 'sg-options', undefined, { role: 'group', 'aria-label': 'जवाब चुनिए' });
    for (const opt of g.options()) {
      const btn = h('button', 'sg-option', undefined, { type: 'button' });
      btn.append(h('span', 'sg-opt-line', opt.lines[0]), h('span', 'sg-opt-line', opt.lines[1]));
      btn.addEventListener('click', () => this.antakPick(opt));
      this.optionButtons.set(opt.id, btn);
      list.append(btn);
    }
    panel.append(list);

    const toggle = h('button', 'sg-link', 'या अपना शेर टाइप कीजिए', { type: 'button', 'aria-expanded': 'false' });
    const form = h('form', 'sg-type');
    form.hidden = true;
    const input = h('input', 'sg-input', undefined, {
      type: 'text',
      lang: 'hi',
      placeholder: `'${g.required}' से शुरू होने वाला शेर`,
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      'aria-label': 'अपना शेर टाइप कीजिए',
    });
    const go = h('button', 'sg-btn', 'जाँचें', { type: 'submit' });
    form.append(input, go);
    toggle.addEventListener('click', () => {
      form.hidden = !form.hidden;
      toggle.setAttribute('aria-expanded', String(!form.hidden));
      if (!form.hidden) input.focus();
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.phase !== 'answering' || !input.value.trim()) return;
      this.antakTyped(input.value);
    });
    this.msg = h('p', 'sg-msg', '', { role: 'status', 'aria-live': 'polite' });
    panel.append(toggle, form, this.msg);
    panel.scrollTop = 0;
  }

  /** Disables the options and marks the valid ones green and (when wrong) the picked one red. */
  private lockOptions(validIds: Set<string>, wrongPickId?: string) {
    this.optionButtons.forEach((btn, id) => {
      btn.disabled = true;
      if (validIds.has(id)) btn.classList.add('is-correct');
      else if (id === wrongPickId) btn.classList.add('is-wrong');
    });
  }

  private antakPick(opt: Entry) {
    if (this.phase !== 'answering') return;
    const g = this.antak!;
    const valid = new Set<string>();
    this.optionButtons.forEach((_b, id) => {
      if (g.continuations(g.current).some((e) => e.id === id)) valid.add(id);
    });
    const res = g.answerByPick(opt.id);
    if (res.kind === 'correct') {
      this.lockOptions(valid);
      this.antakCorrect(res);
    } else {
      this.lockOptions(valid, opt.id);
      this.antakFail(`ग़लत चुनाव — शेर '${g.required}' से शुरू होना था।`);
    }
  }

  private antakTyped(text: string) {
    const g = this.antak!;
    const res = g.answerByText(text);
    switch (res.kind) {
      case 'correct': {
        const valid = new Set([res.entry.id]);
        this.lockOptions(valid);
        this.panel.querySelector('.sg-type')?.setAttribute('hidden', '');
        this.antakCorrect(res);
        break;
      }
      case 'wrong_akshar':
        this.msg.textContent = `यह शेर '${res.entry.first}' से शुरू होता है, '${g.required}' से नहीं। फिर कोशिश कीजिए।`;
        this.penaltyLight();
        break;
      case 'used':
        this.msg.textContent = 'यह शेर इस खेल में पहले आ चुका है।';
        break;
      default:
        this.msg.textContent = 'यह शेर हमारे संग्रह में नहीं मिला। विकल्पों में से चुनिए या फिर से लिखिए।';
    }
  }

  private penaltyLight() {
    if (!prefersReducedMotion()) this.cameras.main.shake(120, 0.003);
  }

  private antakCorrect(res: Extract<AnswerResult, { kind: 'correct' }>) {
    const g = this.antak!;
    this.phase = 'feedback';
    this.reward(res);
    const bonus = res.bonus ? ` + ${res.bonus} लगातार बोनस` : '';
    this.msg.textContent = `वाह! सही जवाब: +${res.points}${bonus}`;
    this.msg.className = 'sg-msg is-good';

    const reply = g.computerReply(res.entry);
    const box = h('div', 'sg-reply');
    if (reply) {
      box.append(h('p', 'sg-label', 'कंप्यूटर का जवाब'), sherCard(reply));
    } else {
      box.append(h('p', 'sg-msg is-good', `कंप्यूटर के पास '${res.entry.last}' से शुरू होने वाला कोई शेर नहीं बचा — यह राउंड आपका!`));
    }
    const last = g.round >= g.rounds;
    box.append(
      this.nextButton(last ? 'नतीजा देखिए' : 'अगला राउंड', () => {
        if (g.nextRound(reply)) this.antakRound();
        else this.finish();
      }),
    );
    this.panel.append(box);
    box.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  private antakFail(reason: string) {
    const g = this.antak!;
    this.phase = 'feedback';
    const valid = new Set<string>();
    this.optionButtons.forEach((_b, id) => {
      if (g.continuations(g.current).some((e) => e.id === id)) valid.add(id);
    });
    this.lockOptions(valid);
    this.panel.querySelector('.sg-type')?.setAttribute('hidden', '');
    const hint = g.fail();
    this.penalty();
    this.msg.textContent = reason;
    this.msg.className = 'sg-msg is-bad';

    const box = h('div', 'sg-reply');
    if (hint) box.append(h('p', 'sg-label', 'सही जवाब, जैसे'), sherCard(hint));
    const last = g.round >= g.rounds;
    box.append(
      this.nextButton(last ? 'नतीजा देखिए' : 'अगला राउंड', () => {
        if (g.nextRound(null)) this.antakRound();
        else this.finish();
      }),
    );
    this.panel.append(box);
    box.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  /* ------------------------- Mode 2: Complete the sher ------------------------- */

  private startComplete() {
    this.complete = new CompleteGame(getCtx(this).entries);
    if (this.complete.total === 0) {
      this.finish();
      return;
    }
    this.completeQuestion();
  }

  private completeButtons: HTMLButtonElement[] = [];

  private completeQuestion() {
    const g = this.complete!;
    const q = g.current!;
    this.setRoundLabel(`सवाल ${g.index + 1}/${g.total}`);
    this.startTimer(g.seconds);

    const panel = this.panel;
    panel.replaceChildren();
    panel.append(h('p', 'sg-label', 'दूसरी पंक्ति चुनिए'));
    panel.append(sherCard(q.entry, { blankSecond: true }));
    const list = h('div', 'sg-options', undefined, { role: 'group', 'aria-label': 'दूसरी पंक्ति के विकल्प' });
    this.completeButtons = q.options.map((text, i) => {
      const btn = h('button', 'sg-option', undefined, { type: 'button' });
      btn.append(h('span', 'sg-opt-line', text));
      btn.addEventListener('click', () => this.completeAnswer(i));
      list.append(btn);
      return btn;
    });
    panel.append(list);
    this.msg = h('p', 'sg-msg', '', { role: 'status', 'aria-live': 'polite' });
    panel.append(this.msg);
    panel.scrollTop = 0;
  }

  /** `index` -1 = timed out. */
  private completeAnswer(index: number) {
    if (this.phase !== 'answering') return;
    const g = this.complete!;
    const q = g.current!;
    this.phase = 'feedback';
    this.completeButtons.forEach((b, i) => {
      b.disabled = true;
      if (i === q.correctIndex) b.classList.add('is-correct');
      else if (i === index) b.classList.add('is-wrong');
    });

    if (index === -1) {
      g.timeout();
      this.penalty();
      this.msg.textContent = 'समय समाप्त!';
      this.msg.className = 'sg-msg is-bad';
    } else {
      const res = g.answer(index);
      if (res.correct) {
        this.reward(res);
        this.msg.textContent = `वाह! सही जवाब: +${res.points}${res.bonus ? ` + ${res.bonus} लगातार बोनस` : ''}`;
        this.msg.className = 'sg-msg is-good';
      } else {
        this.penalty();
        this.msg.textContent = 'ग़लत जवाब। सही पंक्ति ऊपर चिह्नित है।';
        this.msg.className = 'sg-msg is-bad';
      }
    }

    // Reveal the whole sher with its attribution.
    const box = h('div', 'sg-reply');
    box.append(sherCard(q.entry));
    const last = g.index + 1 >= g.total;
    const advance = () => {
      if (g.next()) this.completeQuestion();
      else this.finish();
    };
    box.append(this.nextButton(last ? 'नतीजा देखिए' : 'अगला सवाल', advance));
    this.panel.append(box);
    box.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }
}
