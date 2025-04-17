import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/--+/g, '-') // Replace multiple - with single -
    .trim();
}

export function getInitials(name: string): string {
  if (!name) return '';
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getModelDisplayName(modelId: string): string {
  const modelMap: Record<string, string> = {
    "gpt4o": "GPT-4o",
    "gpt4-1": "GPT-4.1",
    "gpt4": "GPT-4",
    "gpt4o-mini": "GPT-4o Mini",
    "gpt4-mini": "GPT-4.1 Mini",
    "gpt4-1-nano": "GPT-4.1 Nano",
    "gpt35turbo": "GPT-3.5 Turbo",
    "gpt3-mini": "GPT-3 Mini",
    "nano": "Nano (Legacy)"
  };
  
  return modelMap[modelId] || modelId;
}
