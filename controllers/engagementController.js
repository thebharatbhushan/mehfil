import { recordReadingBeat, setBookmark, setLike, getMarks, listBookmarks } from "../services/engagementService.js";

const send = (res, result, body = {}) =>
  result.ok ? res.json({ success: true, ...body }) : res.status(result.status || 400).json({ success: false, message: result.message });

const guard = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    console.error("Engagement error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Body is only { poemId }. No durations, counts or flags are read from the client.
export const readingHeartbeat = guard(async (req, res) => {
  const result = await recordReadingBeat({ userId: req.userId, poemId: req.body?.poemId });
  send(res, result);
});

export const addBookmark = guard(async (req, res) => send(res, await setBookmark({ userId: req.userId, poemId: req.params.poemId, on: true })));
export const removeBookmark = guard(async (req, res) => send(res, await setBookmark({ userId: req.userId, poemId: req.params.poemId, on: false })));
export const addLike = guard(async (req, res) => send(res, await setLike({ userId: req.userId, poemId: req.params.poemId, on: true })));
export const removeLike = guard(async (req, res) => send(res, await setLike({ userId: req.userId, poemId: req.params.poemId, on: false })));
export const poemMarks = guard(async (req, res) => {
  const r = await getMarks({ userId: req.userId, poemId: req.params.poemId });
  send(res, r, { bookmarked: r.bookmarked, liked: r.liked });
});

export const myBookmarks = guard(async (req, res) => {
  const r = await listBookmarks({ userId: req.userId });
  send(res, r, { poems: r.poems });
});
