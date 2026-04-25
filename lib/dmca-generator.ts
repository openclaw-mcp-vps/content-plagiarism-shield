import { format } from "date-fns";

export type DmcaNoticeInput = {
  complainantName: string;
  complainantEmail: string;
  sourceUrl: string;
  sourceTitle: string;
  infringingUrl: string;
  companyName?: string;
};

export function guessAbuseMailbox(infringingUrl: string): string {
  try {
    const hostname = new URL(infringingUrl).hostname.replace(/^www\./, "");
    return `abuse@${hostname}`;
  } catch {
    return "abuse@example.com";
  }
}

export function generateDmcaNotice(input: DmcaNoticeInput): string {
  const today = format(new Date(), "MMMM d, yyyy");
  const claimant = input.companyName?.trim() || input.complainantName.trim();

  return [
    `Date: ${today}`,
    "",
    "Subject: DMCA Takedown Notice - Unauthorized Copyrighted Content",
    "",
    "To Whom It May Concern,",
    "",
    `I am ${input.complainantName}, and I represent ${claimant}. This letter serves as formal notice under the Digital Millennium Copyright Act (17 U.S.C. § 512) regarding unauthorized use of copyrighted material.`,
    "",
    "1) Copyrighted Work",
    `Original title: ${input.sourceTitle}`,
    `Original URL: ${input.sourceUrl}`,
    "",
    "2) Infringing Material",
    `Infringing URL: ${input.infringingUrl}`,
    "",
    "3) Good Faith Statement",
    "I have a good faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law.",
    "",
    "4) Accuracy and Authority Statement",
    "I swear, under penalty of perjury, that the information in this notice is accurate and that I am the copyright owner or authorized to act on behalf of the owner.",
    "",
    "Please remove or disable access to the infringing material promptly.",
    "",
    "Complainant Contact Information",
    `Name: ${input.complainantName}`,
    `Email: ${input.complainantEmail}`,
    "",
    `Electronic Signature: ${input.complainantName}`
  ].join("\n");
}
