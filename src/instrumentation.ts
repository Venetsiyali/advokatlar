// Ichki davriy vazifa faqat Node runtime'da ishga tushadi (Edge bundle'ga tushmasligi uchun alohida fayl).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
