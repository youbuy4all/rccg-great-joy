import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);
}
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric", ...options }).format(new Date(date));
}
export function formatServiceType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
export function formatCategory(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}
export function getMonthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString("en-NG", { month: "long" });
}
export const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
