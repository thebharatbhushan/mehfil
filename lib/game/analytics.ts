/**
 * Play events for Sher Antakshari. The project has no analytics layer yet, so this is a deliberate no-op:
 * wire a provider here (one place) and every call site starts reporting. Payloads carry no personal data.
 */
export type GameEventName = 'game_start' | 'game_end';

export interface GameEventProps {
  mode: 'antakshari' | 'complete';
  /** game_end only */
  score?: number;
}

export function trackGameEvent(name: GameEventName, props: GameEventProps): void {
  void name;
  void props;
}
