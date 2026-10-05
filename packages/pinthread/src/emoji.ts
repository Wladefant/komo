import emojiRegex from "emoji-regex";

export function isEmoji(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 128) return false;
  const match = value.match(emojiRegex());
  return match?.length === 1 && match[0] === value;
}
