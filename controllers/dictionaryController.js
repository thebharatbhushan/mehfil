import { parseSearchParams, prepareQuery } from "../utils/dictionarySearch.js";
import { sanitizeEntryInput } from "../utils/dictionaryInput.js";
import { normalizeText } from "../utils/dictionaryNormalize.js";
import { CSV_COLUMNS, entryToRecord, toCsv } from "../utils/dictionaryCsv.js";
import DictionaryEntry from "../models/DictionaryEntry.js";
import * as svc from "../services/dictionaryService.js";
import { importDictionaryCsv } from "../services/dictionaryImport.js";

const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const serverError = (res, error, what) => {
  console.error(`Dictionary ${what} failed:`, error?.message);
  return fail(res, 500, "Something went wrong. Please try again.");
};
const intParam = (v, def, min, max) => {
  if (v === undefined) return def;
  if (typeof v !== "string" || !/^\d{1,6}$/.test(v)) return NaN;
  return Math.min(max, Math.max(min, Number(v)));
};

// ------------------------------------------------------------------ public ------------------------------------

export const search = async (req, res) => {
  const parsed = parseSearchParams(req.query);
  if (parsed.error) return fail(res, 400, parsed.error);
  try {
    if (prepareQuery(parsed.raw).empty) return res.json({ success: true, query: parsed.raw, count: 0, results: [], message: "Type a word to search." });
    const results = await svc.searchEntries(parsed.raw, parsed.limit);
    res.set("Cache-Control", "public, max-age=30");
    res.json({ success: true, query: parsed.raw, count: results.length, results });
  } catch (error) {
    serverError(res, error, "search");
  }
};

export const featured = async (req, res) => {
  const limit = intParam(req.query.limit, 12, 1, 24);
  if (Number.isNaN(limit)) return fail(res, 400, 'Query parameter "limit" must be a whole number.');
  try {
    const entries = await svc.getFeatured(limit);
    res.set("Cache-Control", "public, max-age=60");
    res.json({ success: true, count: entries.length, entries });
  } catch (error) {
    serverError(res, error, "featured");
  }
};

export const getWord = async (req, res) => {
  try {
    const found = await svc.getPublishedBySlug(req.params.slug);
    if (!found) return fail(res, 404, "Word not found.");
    res.set("Cache-Control", "public, max-age=60");
    res.json({ success: true, ...found });
  } catch (error) {
    serverError(res, error, "word lookup");
  }
};

export const getRelatedWords = async (req, res) => {
  try {
    const related = await svc.getRelated(req.params.slug);
    if (!related) return fail(res, 404, "Word not found.");
    res.set("Cache-Control", "public, max-age=60");
    res.json({ success: true, count: related.length, related });
  } catch (error) {
    serverError(res, error, "related lookup");
  }
};

export const sitemapFeed = async (req, res) => {
  const page = intParam(req.query.page, 1, 1, 100000);
  const limit = intParam(req.query.limit, 1000, 1, 5000);
  if (Number.isNaN(page) || Number.isNaN(limit)) return fail(res, 400, "page and limit must be whole numbers.");
  try {
    const data = await svc.listForSitemap(page, limit);
    res.set("Cache-Control", "public, max-age=300");
    res.json({ success: true, page, ...data });
  } catch (error) {
    serverError(res, error, "sitemap feed");
  }
};

// ------------------------------------------------------------------ admin (mounted behind requireAdmin) -------

const idOr404 = (req, res) => {
  if (!svc.isObjectId(req.params.id)) {
    fail(res, 400, "Invalid entry id.");
    return null;
  }
  return req.params.id;
};

const writeError = (res, error, what) => {
  if (error instanceof svc.DictionaryConflictError) return fail(res, 409, error.message, error.existing ? { existing: { slug: error.existing.slug, canonicalWord: error.existing.canonicalWord } } : {});
  if (error?.name === "ValidationError") return fail(res, 400, Object.values(error.errors || {}).map((e) => e.message).join(" ") || "Validation failed.");
  return serverError(res, error, what);
};

export const adminList = async (req, res) => {
  const page = intParam(req.query.page, 1, 1, 100000);
  const limit = intParam(req.query.limit, 25, 1, 100);
  if (Number.isNaN(page) || Number.isNaN(limit)) return fail(res, 400, "page and limit must be whole numbers.");
  const q = typeof req.query.q === "string" ? req.query.q.slice(0, 80) : "";
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  try {
    res.json({ success: true, ...(await svc.listAdmin({ q, status, page, limit })) });
  } catch (error) {
    serverError(res, error, "admin list");
  }
};

export const adminGet = async (req, res) => {
  const id = idOr404(req, res);
  if (!id) return;
  try {
    const entry = await svc.getAdminEntry(id);
    if (!entry) return fail(res, 404, "Entry not found.");
    res.json({ success: true, entry });
  } catch (error) {
    serverError(res, error, "admin get");
  }
};

/** Live duplicate hint for the editor: hard = same canonical word, soft = word already listed as a spelling elsewhere. */
export const adminCheck = async (req, res) => {
  const word = typeof req.query.word === "string" ? req.query.word.trim().slice(0, 80) : "";
  if (!normalizeText(word)) return res.json({ success: true, duplicate: null, similar: [] });
  const language = ["hi", "ur", "en"].includes(req.query.language) ? req.query.language : "hi";
  const excludeId = svc.isObjectId(req.query.excludeId) ? req.query.excludeId : undefined;
  try {
    const { hard, soft } = await svc.findDuplicates({ canonicalWord: word, language, variants: {} }, excludeId);
    res.json({ success: true, duplicate: hard || null, similar: soft });
  } catch (error) {
    serverError(res, error, "duplicate check");
  }
};

export const adminCreate = async (req, res) => {
  const { value, errors, warnings } = sanitizeEntryInput(req.body);
  if (errors.length) return fail(res, 400, errors[0], { errors });
  try {
    const entry = await svc.createEntry(value);
    const { soft } = await svc.findDuplicates(value, entry._id);
    res.status(201).json({ success: true, entry: await svc.getAdminEntry(entry._id), warnings, similar: soft });
  } catch (error) {
    writeError(res, error, "create");
  }
};

export const adminUpdate = async (req, res) => {
  const id = idOr404(req, res);
  if (!id) return;
  const { value, errors, warnings } = sanitizeEntryInput(req.body, { partial: true });
  if (errors.length) return fail(res, 400, errors[0], { errors });
  try {
    const entry = await svc.updateEntry(id, value);
    if (!entry) return fail(res, 404, "Entry not found.");
    res.json({ success: true, entry: await svc.getAdminEntry(entry._id), warnings });
  } catch (error) {
    writeError(res, error, "update");
  }
};

export const adminSetStatus = async (req, res) => {
  const id = idOr404(req, res);
  if (!id) return;
  const status = req.body?.status;
  if (status !== "draft" && status !== "published") return fail(res, 400, 'status must be "draft" or "published".');
  try {
    const entry = await svc.updateEntry(id, { status });
    if (!entry) return fail(res, 404, "Entry not found.");
    res.json({ success: true, status: entry.status });
  } catch (error) {
    writeError(res, error, "status change");
  }
};

export const adminDelete = async (req, res) => {
  const id = idOr404(req, res);
  if (!id) return;
  try {
    const removed = await svc.deleteEntry(id);
    if (!removed) return fail(res, 404, "Entry not found.");
    res.json({ success: true, deleted: { slug: removed.slug, canonicalWord: removed.canonicalWord } });
  } catch (error) {
    serverError(res, error, "delete");
  }
};

export const adminImport = async (req, res) => {
  if (typeof req.body !== "string" || !req.body.trim()) return fail(res, 400, "Send the CSV file contents as the request body (Content-Type: text/csv).");
  const flag = (v) => v === "1" || v === "true";
  try {
    const report = await importDictionaryCsv(req.body, {
      mode: typeof req.query.mode === "string" ? req.query.mode : "create",
      dryRun: flag(req.query.dryRun),
      skipInvalid: flag(req.query.skipInvalid),
      defaultStatus: typeof req.query.defaultStatus === "string" ? req.query.defaultStatus : "draft",
    });
    res.status(report.fileErrors.length ? 400 : 200).json({ success: report.ok, report });
  } catch (error) {
    serverError(res, error, "import");
  }
};

export const adminExport = async (req, res) => {
  const status = ["draft", "published"].includes(req.query.status) ? { status: req.query.status } : {};
  try {
    const docs = await DictionaryEntry.find(status).sort({ canonicalWord: 1 }).lean();
    const csv = `﻿${toCsv([CSV_COLUMNS, ...docs.map(entryToRecord)])}`; // BOM so Excel opens Hindi / Urdu correctly
    res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="mehfil-dictionary.csv"', "Cache-Control": "no-store" });
    res.send(csv);
  } catch (error) {
    serverError(res, error, "export");
  }
};
