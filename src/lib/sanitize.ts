import sanitizeHtml from "sanitize-html";

/**
 * Admin tahrirlovchisidan kelgan HTML ni tozalash (maqola, mavzu, maʼlumot sahifalari).
 * Faqat matn formatlash teglari; script/style/atributlar olib tashlanadi, havolalar xavfsiz qilinadi.
 */
export function sanitizeRichHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "h2", "h3", "h4", "ul", "ol", "li", "strong", "b", "em", "i", "u", "s", "a", "blockquote", "br", "hr", "code", "pre"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowProtocolRelative: false,
    // Tahrirlovchi qoldiradigan boʻsh paragraflar
    exclusiveFilter: (frame) => frame.tag === "p" && !frame.text.trim() && !frame.mediaChildren.length,
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href ?? "";
        const external = /^https?:\/\//i.test(href);
        const out: Record<string, string> = external ? { href, target: "_blank", rel: "noopener noreferrer nofollow" } : { href };
        return { tagName, attribs: out };
      },
    },
  }).trim();
}

/** HTML dan oddiy matn (meta description, oʻqish vaqti uchun) */
export function htmlToText(html: string): string {
  // Blok teglar orasida soʻzlar qoʻshilib ketmasligi uchun boʻsh joy
  const spaced = html.replace(/<\/(p|h[1-6]|li|blockquote|div)>|<br\s*\/?>/gi, " ");
  return sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
}

export function readingMinutes(html: string) {
  return Math.max(1, Math.round(htmlToText(html).split(" ").length / 180));
}
