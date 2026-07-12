import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy, hh:mm a");
}

export function getCreditTier(credits: number): {
  tier: string;
  maxProjectValue: number;
  stakePercent: number;
} {
  if (credits >= 1000) {
    return { tier: "Elite", maxProjectValue: Infinity, stakePercent: 2 };
  } else if (credits >= 500) {
    return { tier: "Trusted", maxProjectValue: 10000, stakePercent: 3 };
  } else if (credits >= 200) {
    return { tier: "Reliable", maxProjectValue: 2000, stakePercent: 4 };
  } else {
    return { tier: "Starter", maxProjectValue: 500, stakePercent: 5 };
  }
}

export function calculateStakeAmount(
  projectValue: number,
  credits: number
): number {
  const { stakePercent } = getCreditTier(credits);
  return (projectValue * stakePercent) / 100;
}