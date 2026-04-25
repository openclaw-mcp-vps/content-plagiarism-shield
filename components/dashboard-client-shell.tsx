"use client";

import { useState } from "react";
import type { MonitoredContent, ScanResultWithContent } from "@/lib/types";
import { ContentForm } from "@/components/content-form";
import { ScanResults } from "@/components/scan-results";

type DashboardClientShellProps = {
  initialContent: MonitoredContent[];
  initialResults: ScanResultWithContent[];
};

export function DashboardClientShell({ initialContent, initialResults }: DashboardClientShellProps) {
  const [content, setContent] = useState<MonitoredContent[]>(initialContent);
  const [results, setResults] = useState<ScanResultWithContent[]>(initialResults);

  const refresh = async () => {
    const response = await fetch("/api/content", { method: "GET" });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as {
      content: MonitoredContent[];
      results: ScanResultWithContent[];
    };

    setContent(payload.content);
    setResults(payload.results);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <ContentForm
        onCreated={(created) => {
          setContent((prev) => [created, ...prev]);
          void refresh();
        }}
      />
      <ScanResults initialContent={content} initialResults={results} />
    </div>
  );
}
