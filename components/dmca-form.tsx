"use client";

import { useState, type FormEvent } from "react";

type DmcaFormProps = {
  scanResultId: string;
  sourceTitle: string;
  sourceUrl: string;
  infringingUrl: string;
};

type DmcaPayload = {
  message?: string;
  notice?: {
    status: string;
    sentTo: string | null;
    noticeText: string;
  };
};

export function DmcaForm({ scanResultId, sourceTitle, sourceUrl, infringingUrl }: DmcaFormProps) {
  const [complainantName, setComplainantName] = useState("");
  const [complainantEmail, setComplainantEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<DmcaPayload["notice"] | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("/api/dmca", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          scanResultId,
          complainantName,
          complainantEmail,
          companyName,
          sendEmail: true
        })
      });

      const payload = (await response.json()) as DmcaPayload;

      if (!response.ok || !payload.notice) {
        throw new Error(payload.message ?? "DMCA generation failed.");
      }

      setNotice(payload.notice);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "DMCA generation failed.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
      <p className="text-sm font-semibold text-white">Issue DMCA Takedown</p>
      <p className="mt-2 text-xs text-slate-400">
        Source: <span className="text-slate-200">{sourceTitle}</span>
      </p>
      <p className="mt-1 break-words text-xs text-slate-400">{sourceUrl}</p>
      <p className="mt-1 break-words text-xs text-slate-400">Potential copy: {infringingUrl}</p>

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <input
          required
          value={complainantName}
          onChange={(event) => setComplainantName(event.target.value)}
          placeholder="Complainant full name"
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-blue-500 focus:ring"
        />
        <input
          required
          type="email"
          value={complainantEmail}
          onChange={(event) => setComplainantEmail(event.target.value)}
          placeholder="Complainant email"
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-blue-500 focus:ring"
        />
        <input
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          placeholder="Company (optional)"
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-blue-500 focus:ring"
        />
        <button
          type="submit"
          disabled={isSending}
          className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? "Sending notice..." : "Generate and Send DMCA"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

      {notice ? (
        <div className="mt-4 rounded-md border border-slate-700 bg-slate-900/70 p-3">
          <p className="text-sm text-slate-200">
            Status: <span className="font-semibold">{notice.status}</span>
          </p>
          <p className="text-sm text-slate-300">Sent to: {notice.sentTo ?? "Draft only"}</p>
          <textarea
            readOnly
            value={notice.noticeText}
            className="mt-3 h-52 w-full rounded-md border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-200"
          />
        </div>
      ) : null}
    </div>
  );
}
