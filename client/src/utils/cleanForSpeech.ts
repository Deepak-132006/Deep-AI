
export function cleanForSpeech(text: string): string {
  return (
    text
      // Remove fenced code blocks completely
      .replace(/```[\s\S]*?```/g, " ")

      // Remove Markdown images, but keep link text
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")

      // Remove HTML tags
      .replace(/<[^>]*>/g, " ")

      // Remove URLs and email addresses
      .replace(/https?:\/\/\S+|www\.\S+/gi, " ")
      .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, " ")

      // Remove inline code formatting
      .replace(/`([^`]+)`/g, "$1")

      // Remove Markdown headings, quotes and list prefixes
      .replace(/^\s{0,3}#{1,6}\s*/gm, "")
      .replace(/^\s*>\s?/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+[.)]\s+/gm, "")

      // Remove Markdown formatting characters
      .replace(/[*_~]+/g, "")
      .replace(/[\[\]{}|\\^=<>]/g, " ")

      // Remove emojis and other Unicode symbols
      .replace(/[^\p{L}\p{N}\s.,!?;:'’"()-]/gu, " ")

      // Normalize whitespace and punctuation spacing
      .replace(/\s+/g, " ")
      .replace(/\s+([.,!?;:])/g, "$1")
      .trim()
  );
}
