"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import type { MonitoredContent, ScanResultWithContent } from "@/lib/types";
import { DmcaForm } from "@/components/dmca-form";

type ScanResultsProps = {
  initialContent: MonitoredContent[];
  initialResults: ScanResultWithContent[];
};

type ScanResponse = {
  message?: string;
  results?: ScanResultWithContent[];
};

export function ScanResults({ initialContent, initialResults }: ScanResultsProps) {
  const [content, setContent] = useState<MonitoredContent[]>(initialContent);
  const [results, setResults] = useState<ScanResultWithContent[]>(initialResults);
  const [status, setStatus] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    setResults(initialResults);
  }, [initialResults]);

  const unresolvedCount = useMemo(() => results.filter((result) => !result.resolved).length, [results]);

  const refresh = async () => {
    const response = await fetch("/api/content", { method: "GET" });
    const payload = (await response.json()) as {
      content: MonitoredContent[];
      results: ScanResultWithContent[];
      message?: string;
    };

    if (!response.ok) {
      throw new Error(payload.message ?? "Unable to refresh dashboard data.");
    }

    setContent(payload.content);
    setResults(payload.results);
  };

  const runScan = async () => {
    setIsScanning(true);
    setStatus(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });

      const payload = (await response.json()) as ScanResponse;

      if (!response.ok || !payload.results) {
        throw new Error(payload.message ?? "Scan failed.");
      }

      setResults(payload.results);
      await refresh();
      setStatus(`Scan complete. ${payload.results.filter((item) => !item.resolved).length} active findings in queue.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Scan failed.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Detection Queue</h2>
          <p className="text-sm text-slate-300">
            {content.length} monitored URLs • {unresolvedCount} unresolved matches
          </p>
        </div>
        <button
          type="button"
          disabled={isScanning || content.length === 0}
          onClick={runScan}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isScanning ? "Scanning web..." : "Run Scan Now"}
        </button>
      </div>

      {status ? <p className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">{status}</p> : null}

      {content.length === 0 ? (
        <p className="rounded-md border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300">
          No content URLs are monitored yet. Add at least one URL to start scanning.
        </p>
      ) : (
        <div className="grid gap-3">
          {content.map((item) => (
            <article key={item.id} className="rounded-lg border border-slate-700 bg-slate-900/70 p-4">
              <p className="text-base font-medium text-white">{item.title}</p>
              <p className="mt-1 break-words font-mono text-xs text-slate-400">{item.sourceUrl}</p>
              <p className="mt-2 text-sm text-slate-300">{item.excerpt}</p>
              <p className="mt-3 text-xs text-slate-400">
                Last scan: {item.lastScanAt ? `${formatDistanceToNow(new Date(item.lastScanAt))} ago` : "Never"}
              </p>
            </article>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-base font-semibold text-white">Potential Unauthorized Republishes</h3>
        {results.length === 0 ? (
          <p className="rounded-md border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300">
            No suspicious matches found yet. Keep scanning as your content library grows.
          </p>
        ) : (
          results.map((result) => (
            <article key={result.id} className="space-y-3 rounded-lg border border-slate-700 bg-slate-900/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-300">Original: <span className="font-medium text-white">{result.contentTitle}</span></p>
                  <p className="mt-1 break-words font-mono text-xs text-slate-400">{result.infringingUrl}</p>
                </div>
                <p className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200">
                  Similarity: {Math.round(result.confidence * 100)}%
                </p>
              </div>
              <p className="text-sm text-slate-300">{result.matchedExcerpt}</p>
              <p className="text-xs text-slate-400">
                Found {formatDistanceToNow(new Date(result.scanDate))} ago • {result.resolved ? "Resolved" : "Action needed"}
              </p>

              {!result.resolved ? (
                <DmcaForm
                  scanResultId={result.id}
                  sourceTitle={result.contentTitle}
                  sourceUrl={result.sourceUrl}
                  infringingUrl={result.infringingUrl}
                />
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
