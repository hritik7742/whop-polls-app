import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function isPollExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

export function getPollStatus(expiresAt: string): 'active' | 'expired' {
  return isPollExpired(expiresAt) ? 'expired' : 'active';
}
