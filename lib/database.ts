import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  DatabaseShape,
  DmcaNotice,
  MonitoredContent,
  PaidCustomer,
  ScanMatchInput,
  ScanResult,
  ScanResultWithContent,
  WebhookEvent
} from "@/lib/types";

const DB_PATH = process.env.DB_FILE_PATH ?? path.join(process.cwd(), "data", "storage.json");

const EMPTY_DB: DatabaseShape = {
  customers: [],
  content: [],
  results: [],
  notices: [],
  webhookEvents: []
};

let writeQueue: Promise<unknown> = Promise.resolve();

async function ensureDbFile(): Promise<void> {
  await mkdir(path.dirname(DB_PATH), { recursive: true });

  try {
    await readFile(DB_PATH, "utf8");
  } catch {
    await writeFile(DB_PATH, JSON.stringify(EMPTY_DB, null, 2), "utf8");
  }
}

async function readDb(): Promise<DatabaseShape> {
  await ensureDbFile();
  const raw = await readFile(DB_PATH, "utf8");

  try {
    const parsed = JSON.parse(raw) as DatabaseShape;
    return {
      customers: parsed.customers ?? [],
      content: parsed.content ?? [],
      results: parsed.results ?? [],
      notices: parsed.notices ?? [],
      webhookEvents: parsed.webhookEvents ?? []
    };
  } catch {
    return { ...EMPTY_DB };
  }
}

async function writeDb(db: DatabaseShape): Promise<void> {
  await writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

async function withDbLock<T>(operation: (db: DatabaseShape) => Promise<T> | T): Promise<T> {
  const run = async (): Promise<T> => {
    const db = await readDb();
    const result = await operation(db);
    await writeDb(db);
    return result;
  };

  const next = writeQueue.then(run, run);
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function canonicalUrl(input: string): string {
  const trimmed = input.trim();

  try {
    const url = new URL(trimmed);
    url.hash = "";

    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString();
  } catch {
    return trimmed;
  }
}

export async function markCustomerPaid(email: string, source: PaidCustomer["source"], stripeCustomerId: string | null = null): Promise<PaidCustomer> {
  const normalizedEmail = normalizeEmail(email);

  return withDbLock((db) => {
    const existing = db.customers.find((item) => item.email === normalizedEmail);

    if (existing) {
      existing.paidAt = new Date().toISOString();
      existing.source = source;
      existing.stripeCustomerId = stripeCustomerId;
      return existing;
    }

    const customer: PaidCustomer = {
      email: normalizedEmail,
      paidAt: new Date().toISOString(),
      source,
      stripeCustomerId
    };

    db.customers.push(customer);
    return customer;
  });
}

export async function isCustomerPaid(email: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const db = await readDb();
  return db.customers.some((item) => item.email === normalizedEmail);
}

export async function addMonitoredContent(params: {
  ownerEmail: string;
  sourceUrl: string;
  title: string;
  excerpt: string;
  contentFingerprint: string | null;
}): Promise<MonitoredContent> {
  return withDbLock((db) => {
    const normalizedEmail = normalizeEmail(params.ownerEmail);
    const normalizedUrl = canonicalUrl(params.sourceUrl);
    const now = new Date().toISOString();

    const existing = db.content.find(
      (item) => item.ownerEmail === normalizedEmail && canonicalUrl(item.sourceUrl) === normalizedUrl
    );

    if (existing) {
      existing.title = params.title;
      existing.excerpt = params.excerpt;
      existing.contentFingerprint = params.contentFingerprint;
      existing.updatedAt = now;
      return existing;
    }

    const content: MonitoredContent = {
      id: randomUUID(),
      ownerEmail: normalizedEmail,
      sourceUrl: normalizedUrl,
      title: params.title,
      excerpt: params.excerpt,
      contentFingerprint: params.contentFingerprint,
      createdAt: now,
      updatedAt: now,
      lastScanAt: null
    };

    db.content.push(content);
    return content;
  });
}

export async function listMonitoredContent(ownerEmail: string): Promise<MonitoredContent[]> {
  const normalizedEmail = normalizeEmail(ownerEmail);
  const db = await readDb();

  return db.content
    .filter((item) => item.ownerEmail === normalizedEmail)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function listAllMonitoredContent(): Promise<MonitoredContent[]> {
  const db = await readDb();
  return [...db.content].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getContentById(contentId: string): Promise<MonitoredContent | null> {
  const db = await readDb();
  return db.content.find((item) => item.id === contentId) ?? null;
}

export async function updateContentLastScan(contentId: string, scanTimestamp: string): Promise<void> {
  await withDbLock((db) => {
    const target = db.content.find((item) => item.id === contentId);

    if (target) {
      target.lastScanAt = scanTimestamp;
      target.updatedAt = scanTimestamp;
    }
  });
}

export async function upsertScanResults(contentId: string, matches: ScanMatchInput[]): Promise<ScanResult[]> {
  return withDbLock((db) => {
    const now = new Date().toISOString();

    for (const match of matches) {
      const existing = db.results.find(
        (item) => item.contentId === contentId && canonicalUrl(item.infringingUrl) === canonicalUrl(match.infringingUrl)
      );

      if (existing) {
        existing.confidence = match.confidence;
        existing.matchedExcerpt = match.matchedExcerpt;
        existing.scanDate = now;
        existing.resolved = false;
      } else {
        db.results.push({
          id: randomUUID(),
          contentId,
          infringingUrl: canonicalUrl(match.infringingUrl),
          confidence: match.confidence,
          matchedExcerpt: match.matchedExcerpt,
          scanDate: now,
          resolved: false
        });
      }
    }

    return db.results
      .filter((item) => item.contentId === contentId)
      .sort((a, b) => (a.scanDate < b.scanDate ? 1 : -1));
  });
}

export async function listScanResultsByOwner(ownerEmail: string): Promise<ScanResultWithContent[]> {
  const normalizedEmail = normalizeEmail(ownerEmail);
  const db = await readDb();

  const contentMap = new Map<string, MonitoredContent>(
    db.content.filter((item) => item.ownerEmail === normalizedEmail).map((item) => [item.id, item])
  );

  return db.results
    .filter((result) => contentMap.has(result.contentId))
    .map((result) => {
      const content = contentMap.get(result.contentId)!;
      return {
        ...result,
        contentTitle: content.title,
        sourceUrl: content.sourceUrl,
        ownerEmail: content.ownerEmail
      };
    })
    .sort((a, b) => (a.scanDate < b.scanDate ? 1 : -1));
}

export async function getScanResultForOwner(ownerEmail: string, scanResultId: string): Promise<ScanResultWithContent | null> {
  const results = await listScanResultsByOwner(ownerEmail);
  return results.find((item) => item.id === scanResultId) ?? null;
}

export async function resolveScanResult(scanResultId: string): Promise<void> {
  await withDbLock((db) => {
    const target = db.results.find((item) => item.id === scanResultId);

    if (target) {
      target.resolved = true;
    }
  });
}

export async function createDmcaNotice(params: {
  scanResultId: string;
  complainantName: string;
  complainantEmail: string;
  status: DmcaNotice["status"];
  noticeText: string;
  sentTo: string | null;
}): Promise<DmcaNotice> {
  return withDbLock((db) => {
    const notice: DmcaNotice = {
      id: randomUUID(),
      scanResultId: params.scanResultId,
      complainantName: params.complainantName,
      complainantEmail: params.complainantEmail,
      status: params.status,
      noticeText: params.noticeText,
      sentTo: params.sentTo,
      createdAt: new Date().toISOString()
    };

    db.notices.push(notice);
    return notice;
  });
}

export async function hasWebhookEvent(id: string): Promise<boolean> {
  const db = await readDb();
  return db.webhookEvents.some((event) => event.id === id);
}

export async function recordWebhookEvent(params: {
  id: string;
  provider: string;
  payload: unknown;
}): Promise<WebhookEvent> {
  return withDbLock((db) => {
    const existing = db.webhookEvents.find((event) => event.id === params.id);

    if (existing) {
      return existing;
    }

    const event: WebhookEvent = {
      id: params.id,
      provider: params.provider,
      payload: JSON.stringify(params.payload),
      receivedAt: new Date().toISOString()
    };

    db.webhookEvents.push(event);
    return event;
  });
}
