"use client";

import { useState, type FormEvent } from "react";

export function UnlockAccessForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to unlock your account.");
      }

      setStatus("Access unlocked. Opening your dashboard...");
      window.location.href = "/dashboard";
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to unlock your account.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <p className="text-sm text-slate-300">
        Already paid on Stripe? Enter the same checkout email to activate your dashboard access cookie.
      </p>
      <label className="flex flex-col gap-2 text-sm text-slate-200">
        Purchase Email
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          className="rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-blue-500 transition focus:ring"
        />
      </label>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Verifying purchase..." : "Unlock Dashboard"}
      </button>
      {status ? <p className="text-sm text-slate-300">{status}</p> : null}
    </form>
  );
}
