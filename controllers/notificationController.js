import {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  removeNotification,
  clearRead,
  sendBroadcast,
  listBroadcasts,
  retractBroadcast,
} from "../services/notificationService.js";
import { NOTIFICATION_TYPES, BROADCAST_TYPE_KEYS, POLICY_LINKS } from "../config/notifications.js";

const fail = (res, status, message) => res.status(status).json({ success: false, message });
const guard = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    console.error("Notification API error:", error.message);
    fail(res, 500, "Server error.");
  }
};

/* ------------------------------ member (auth required) ----------------------------- */

// GET /api/notifications?page=1&limit=20&filter=all|unread&category=account|achievement|poem|moderation|support|system
export const getMyNotifications = guard(async (req, res) => {
  const data = await listNotifications(req.userId, {
    page: req.query.page,
    limit: req.query.limit,
    filter: req.query.filter === "unread" ? "unread" : "all",
    category: String(req.query.category || ""),
  });
  res.json({ success: true, ...data });
});

// GET /api/notifications/unread-count  (cheap; the site polls this for the bell badge)
export const getMyUnreadCount = guard(async (req, res) => {
  res.json({ success: true, unreadCount: await getUnreadCount(req.userId) });
});

// PATCH /api/notifications/:id/read
export const readOne = guard(async (req, res) => {
  const n = await markRead(req.userId, req.params.id);
  if (!n) return fail(res, 404, "Notification not found.");
  res.json({ success: true, unreadCount: await getUnreadCount(req.userId) });
});

// POST /api/notifications/read-all
export const readAll = guard(async (req, res) => {
  const updated = await markAllRead(req.userId);
  res.json({ success: true, updated, unreadCount: 0 });
});

// DELETE /api/notifications/:id
export const deleteOne = guard(async (req, res) => {
  const ok = await removeNotification(req.userId, req.params.id);
  if (!ok) return fail(res, 404, "Notification not found.");
  res.json({ success: true, unreadCount: await getUnreadCount(req.userId) });
});

// DELETE /api/notifications?scope=read   (removes the member's already-read notifications)
export const deleteRead = guard(async (req, res) => {
  if (req.query.scope !== "read") return fail(res, 400, "Use ?scope=read.");
  const removed = await clearRead(req.userId);
  res.json({ success: true, removed, unreadCount: await getUnreadCount(req.userId) });
});

/* ------------------------------------ admin ------------------------------------ */

// GET /api/admin/notifications/types  -> what the admin form can send
export const adminTypes = (req, res) =>
  res.json({
    success: true,
    types: BROADCAST_TYPE_KEYS.map((key) => ({
      key,
      label: NOTIFICATION_TYPES[key].label,
      priority: NOTIFICATION_TYPES[key].priority,
      defaultLink: NOTIFICATION_TYPES[key].defaultLink || "",
    })),
    policyLinks: POLICY_LINKS,
  });

// POST /api/admin/notifications/send  body: { type, title, message, link?, priority?, audience: all|writers|user, userId? }
export const adminSend = guard(async (req, res) => {
  const b = req.body || {};
  const result = await sendBroadcast({
    type: b.type,
    title: b.title,
    message: b.message,
    link: b.link,
    priority: b.priority,
    audience: b.audience,
    targetUserId: b.userId,
    adminId: req.adminId || "admin",
  });
  if (!result.ok) return fail(res, result.status || 400, result.message);
  res.status(201).json({ success: true, broadcast: result.broadcast, recipientCount: result.broadcast.recipientCount });
});

// GET /api/admin/notifications/history
export const adminHistory = guard(async (req, res) => {
  res.json({ success: true, items: await listBroadcasts({ limit: req.query.limit }) });
});

// DELETE /api/admin/notifications/history/:id  -> removes every copy from members' inboxes
export const adminRetract = guard(async (req, res) => {
  const result = await retractBroadcast(req.params.id);
  if (!result.ok) return fail(res, result.status || 400, result.message);
  res.json({ success: true, removed: result.removed });
});
