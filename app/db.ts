import Database from "better-sqlite3";
import path from "path";
import { homedir } from "os";
import { mkdirSync, existsSync } from "fs";

export const LITREVIEW_DIR = path.join(homedir(), ".litreview");
const DB_PATH = path.join(LITREVIEW_DIR, "data.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    if (!existsSync(LITREVIEW_DIR)) mkdirSync(LITREVIEW_DIR, { recursive: true });
    db = new Database(DB_PATH);
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT,
      authors TEXT,
      abstract TEXT,
      pdf_path TEXT,
      xml TEXT,
      parsed_at TEXT,
      model_used TEXT
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id TEXT REFERENCES articles(id) ON DELETE CASCADE,
      task INTEGER NOT NULL,
      model TEXT NOT NULL,
      result TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(article_id, task, model)
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

export interface Article {
  id: string;
  title: string | null;
  authors: string | null;
  abstract: string | null;
  pdf_path: string | null;
  xml: string | null;
  parsed_at: string | null;
  model_used: string | null;
}

export interface Review {
  id: number;
  article_id: string;
  task: number;
  model: string;
  result: string;
  created_at: string;
}

export interface ArticleFilters {
  search?: string;
  sort?: "parsed_at" | "title";
  order?: "asc" | "desc";
}

export function getArticles(filters: ArticleFilters = {}): Article[] {
  const database = getDb();
  let sql = "SELECT id, title, authors, abstract, pdf_path, xml, parsed_at, model_used FROM articles WHERE 1=1";
  const params: (string | number)[] = [];
  if (filters.search) {
    sql += " AND (title LIKE ? OR abstract LIKE ? OR authors LIKE ?)";
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }
  const sortCol = filters.sort === "title" ? "title" : "parsed_at";
  const order = filters.order === "asc" ? "ASC" : "DESC";
  sql += ` ORDER BY ${sortCol} ${order}`;
  const stmt = database.prepare(sql);
  return stmt.all(...params) as Article[];
}

export function getArticle(id: string): Article | null {
  const database = getDb();
  const row = database.prepare(
    "SELECT id, title, authors, abstract, pdf_path, xml, parsed_at, model_used FROM articles WHERE id = ?"
  ).get(id) as Article | undefined;
  return row ?? null;
}

export function upsertArticle(article: {
  id: string;
  title?: string | null;
  authors?: string | null;
  abstract?: string | null;
  pdf_path?: string | null;
  xml?: string | null;
  parsed_at?: string | null;
  model_used?: string | null;
}): void {
  const database = getDb();
  database.prepare(`
    INSERT INTO articles (id, title, authors, abstract, pdf_path, xml, parsed_at, model_used)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = COALESCE(excluded.title, title),
      authors = COALESCE(excluded.authors, authors),
      abstract = COALESCE(excluded.abstract, abstract),
      pdf_path = COALESCE(excluded.pdf_path, pdf_path),
      xml = COALESCE(excluded.xml, xml),
      parsed_at = COALESCE(excluded.parsed_at, parsed_at),
      model_used = COALESCE(excluded.model_used, model_used)
  `).run(
    article.id,
    article.title ?? null,
    article.authors ?? null,
    article.abstract ?? null,
    article.pdf_path ?? null,
    article.xml ?? null,
    article.parsed_at ?? null,
    article.model_used ?? null
  );
}

export function deleteArticle(id: string): void {
  const database = getDb();
  database.prepare("DELETE FROM articles WHERE id = ?").run(id);
}

export function getReviews(articleId: string): Review[] {
  const database = getDb();
  return database.prepare(
    "SELECT id, article_id, task, model, result, created_at FROM reviews WHERE article_id = ? ORDER BY created_at DESC"
  ).all(articleId) as Review[];
}

export function getReview(articleId: string, task: number, model: string): Review | null {
  const database = getDb();
  const row = database.prepare(
    "SELECT id, article_id, task, model, result, created_at FROM reviews WHERE article_id = ? AND task = ? AND model = ?"
  ).get(articleId, task, model) as Review | undefined;
  return row ?? null;
}

export function upsertReview(articleId: string, task: number, model: string, result: string): void {
  const database = getDb();
  database.prepare(`
    INSERT INTO reviews (article_id, task, model, result) VALUES (?, ?, ?, ?)
    ON CONFLICT(article_id, task, model) DO UPDATE SET result = excluded.result, created_at = datetime('now')
  `).run(articleId, task, model, result);
}

export function getSetting(key: string): string | null {
  const database = getDb();
  const row = database.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  const database = getDb();
  database.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}