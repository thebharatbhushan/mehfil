'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';
import { useTr } from '@/lib/uiTranslate';
import { iconFor, linkKind, timeAgo, type NotificationItem } from '@/lib/notifications';

interface Props {
  item: NotificationItem;
  /** Called when the row is opened (clicked). The parent marks it read. */
  onOpen: (item: NotificationItem) => void;
  /** Optional extra controls shown on the right (mark read / delete on the full page). */
  actions?: ReactNode;
  compact?: boolean;
  /** When set, clicking the row always goes to this internal page instead of the notification's own link. */
  linkOverride?: string;
}

/** One notification row. The whole row is a link when the notification has one, otherwise a plain row. */
export function NotificationItemView({ item, onOpen, actions, compact, linkOverride }: Props) {
  const tr = useTr();
  const kind = linkOverride ? 'internal' : linkKind(item.link);
  const href = linkOverride || item.link;
  const cls = `ntf-item${item.read ? '' : ' unread'}${item.priority === 'high' ? ' high' : ''}${compact ? ' compact' : ''}`;

  const body = (
    <>
      <span className={`ntf-icon cat-${item.category}`} aria-hidden="true">
        <i className={`fas ${iconFor(item)}`} />
      </span>
      <span className="ntf-text">
        <span className="ntf-title">
          {tr(item.title)}
          {!item.read && <span className="ntf-dot" aria-label={tr('अपठित')} />}
        </span>
        {item.message && <span className="ntf-msg">{tr(item.message)}</span>}
        <span className="ntf-time">{tr(timeAgo(item.createdAt))}</span>
      </span>
    </>
  );

  const open = () => onOpen(item);

  return (
    <li className={`${cls} notranslate`} translate="no">
      {kind === 'internal' ? (
        <Link href={href} className="ntf-main" onClick={open}>
          {body}
        </Link>
      ) : kind === 'external' ? (
        <a href={item.link} className="ntf-main" target="_blank" rel="noopener noreferrer" onClick={open}>
          {body}
        </a>
      ) : (
        <button
          type="button"
          className="ntf-main"
          onClick={(e: MouseEvent) => {
            e.preventDefault();
            open();
          }}
        >
          {body}
        </button>
      )}
      {actions && <span className="ntf-actions">{actions}</span>}
    </li>
  );
}
