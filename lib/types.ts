export type PaidCustomer = {
  email: string;
  paidAt: string;
  source: "stripe" | "manual";
  stripeCustomerId: string | null;
};

export type MonitoredContent = {
  id: string;
  ownerEmail: string;
  title: string;
  sourceUrl: string;
  excerpt: string;
  contentFingerprint: string | null;
  createdAt: string;
  updatedAt: string;
  lastScanAt: string | null;
};

export type ScanResult = {
  id: string;
  contentId: string;
  infringingUrl: string;
  confidence: number;
  matchedExcerpt: string;
  scanDate: string;
  resolved: boolean;
};

export type ScanResultWithContent = ScanResult & {
  contentTitle: string;
  sourceUrl: string;
  ownerEmail: string;
};

export type DmcaNotice = {
  id: string;
  scanResultId: string;
  complainantName: string;
  complainantEmail: string;
  status: "draft" | "sent" | "failed";
  noticeText: string;
  sentTo: string | null;
  createdAt: string;
};

export type WebhookEvent = {
  id: string;
  provider: string;
  payload: string;
  receivedAt: string;
};

export type ScanMatchInput = {
  infringingUrl: string;
  confidence: number;
  matchedExcerpt: string;
};

export type DatabaseShape = {
  customers: PaidCustomer[];
  content: MonitoredContent[];
  results: ScanResult[];
  notices: DmcaNotice[];
  webhookEvents: WebhookEvent[];
};
