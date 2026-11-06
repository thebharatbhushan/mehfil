import Phaser from 'phaser';
import { CTX_KEY, GAME_H, GAME_W, THEME_EVENT, type GameContext } from '../types';
import { prefersReducedMotion, type Palette } from '../theme';

export const getCtx = (scene: Phaser.Scene): GameContext => scene.registry.get(CTX_KEY) as GameContext;

/** Ivory / dark paper, a thin inner frame, two soft rings and a few drifting sparks. Re-colours itself when the site theme changes. */
export class Backdrop {
  private readonly scene: Phaser.Scene;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly motes: Phaser.GameObjects.Arc[] = [];
  private readonly onTheme: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.g = scene.add.graphics().setDepth(-10);
    const pal = getCtx(scene).palette();
    this.draw(pal);

    if (!prefersReducedMotion()) {
      for (let i = 0; i < 12; i++) {
        const m = scene.add.circle(Math.random() * GAME_W, Math.random() * GAME_H, 1.5 + Math.random() * 2.5, pal.accentSoft.n, 0.5).setDepth(-9);
        this.motes.push(m);
        scene.tweens.add({
          targets: m,
          y: m.y - 80 - Math.random() * 120,
          alpha: { from: 0.1, to: 0.55 },
          duration: 5000 + Math.random() * 5000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Math.random() * 3000,
        });
      }
    }

    // Theme switch: repaint without restarting the scene.
    this.onTheme = () => {
      const next = getCtx(scene).palette();
      this.draw(next);
      this.motes.forEach((m) => m.setFillStyle(next.accentSoft.n, 0.5));
    };
    scene.game.events.on(THEME_EVENT, this.onTheme);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  private draw(pal: Palette) {
    const g = this.g;
    g.clear();
    g.fillStyle(pal.bg.n, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);
    g.lineStyle(2, pal.accentSoft.n, pal.dark ? 0.6 : 0.5);
    g.strokeCircle(GAME_W - 30, GAME_H - 40, 150);
    g.strokeCircle(GAME_W - 30, GAME_H - 40, 190);
    g.strokeCircle(20, 60, 110);
    g.lineStyle(1.5, pal.accent.n, pal.dark ? 0.45 : 0.35);
    g.strokeRoundedRect(8, 8, GAME_W - 16, GAME_H - 16, 14);
  }

  destroy() {
    this.scene.game.events.off(THEME_EVENT, this.onTheme);
  }
}

/** Small gold-ish burst of sparks (skipped when the visitor prefers reduced motion). */
export function sparkBurst(scene: Phaser.Scene, x: number, y: number, color: number, count = 14) {
  if (prefersReducedMotion()) return;
  for (let i = 0; i < count; i++) {
    const dot = scene.add.circle(x, y, 2 + Math.random() * 3, color, 0.95).setDepth(20);
    const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const dist = 40 + Math.random() * 70;
    scene.tweens.add({
      targets: dot,
      x: x + Math.cos(ang) * dist,
      y: y + Math.sin(ang) * dist,
      alpha: 0,
      scale: 0.3,
      duration: 500 + Math.random() * 300,
      ease: 'Cubic.easeOut',
      onComplete: () => dot.destroy(),
    });
  }
}

/** Floating "+15" that rises and fades. */
export function floatText(scene: Phaser.Scene, x: number, y: number, text: string, color: string, fontFamily: string) {
  const t = scene.add
    .text(x, y, text, { fontFamily, fontSize: '30px', fontStyle: '700', color, padding: { top: 8, bottom: 8, left: 4, right: 4 } })
    .setOrigin(0.5)
    .setDepth(30);
  scene.tweens.add({
    targets: t,
    y: y - (prefersReducedMotion() ? 0 : 50),
    alpha: 0,
    duration: 900,
    ease: 'Cubic.easeOut',
    onComplete: () => t.destroy(),
  });
}
