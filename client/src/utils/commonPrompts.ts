const WELCOME_KEY = "aidify_common_welcome";
const QUESTIONS_KEY = "aidify_common_questions";

export function loadCommon(type: "welcome" | "question"): string[] {
  const key = type === "welcome" ? WELCOME_KEY : QUESTIONS_KEY;
  try {
    const raw = localStorage.getItem(key);
    return raw ? Array.from(new Set(JSON.parse(raw))) : [];
  } catch {
    return [];
  }
}

export function saveCommon(type: "welcome" | "question", text: string): string[] {
  const list = loadCommon(type);
  if (!text.trim() || list.includes(text)) return list;
  const updated = [...list, text];
  const key = type === "welcome" ? WELCOME_KEY : QUESTIONS_KEY;
  localStorage.setItem(key, JSON.stringify(updated));
  return updated;
}