import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strips URL prefixes, path segments, and leading '@' signs from handles.
 */
export function cleanHandle(input?: string | null): string {
  if (!input || typeof input !== 'string') return '';
  let cleaned = input.trim();
  cleaned = cleaned.replace(/^https?:\/\/(?:www\.)?leetcode\.com\/(?:u\/)?/i, '');
  cleaned = cleaned.replace(/^https?:\/\/(?:www\.)?codeforces\.com\/(?:profile\/)?/i, '');
  cleaned = cleaned.replace(/^https?:\/\/(?:www\.)?github\.com\//i, '');
  cleaned = cleaned.split('/')[0].split('?')[0].trim();
  cleaned = cleaned.replace(/^@+/, '');
  return cleaned;
}
