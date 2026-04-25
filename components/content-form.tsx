"use client";

import { useState, type FormEvent } from "react";
import type { MonitoredContent } from "@/lib/types";

type ContentFormProps = {
  onCreated: (content: MonitoredContent) => void;
};

export function ContentForm({ onCreated }: ContentFormProps) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sourceUrl, title })
      });

      const payload = (await response.json()) as {
        message?: string;
        content?: MonitoredContent;
      };

      if (!response.ok || !payload.content) {
        throw new Error(payload.message ?? "Could not save content URL.");
      }

      onCreated(payload.content);
      setSourceUrl("");
      setTitle("");
      setStatus("URL saved. You can run a scan now.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save content URL.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
      <h2 className="text-lg font-semibold text-white">Add Content to Monitor</h2>
      <label className="flex flex-col gap-1 text-sm text-slate-300">
        Content URL
        <input
          required
          type="url"
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          placeholder="https://yourdomain.com/blog/high-intent-guide"
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-blue-500 focus:ring"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-slate-300">
        Optional Custom Title
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="If blank, title is pulled from the page"
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-blue-500 focus:ring"
        />
      </label>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Saving URL..." : "Save URL"}
      </button>
      {status ? <p className="text-sm text-slate-300">{status}</p> : null}
    </form>
  );
}
