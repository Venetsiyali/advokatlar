import { getTranslations } from "next-intl/server";

/** Sahifa yuklanayotganda darhol koʻrinadigan skelet (sekin internetda oq ekran oʻrniga) */
export async function PageSkeleton({ cards = false }: { cards?: boolean }) {
  const t = await getTranslations("common");
  const bar = "animate-pulse rounded-lg bg-navy-100/70";
  return (
    <div className="mx-auto max-w-6xl px-4 py-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">{t("loading")}</span>
      <div className={`${bar} h-4 w-40`} />
      <div className={`${bar} mt-4 h-9 w-2/3 max-w-md`} />
      <div className={`${bar} mt-3 h-4 w-full max-w-xl`} />
      {cards ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-2xl border border-navy-100/70 bg-white p-4 sm:p-5">
              <div className="flex gap-3">
                <div className={`${bar} size-14 shrink-0 rounded-2xl`} />
                <div className="flex-1 space-y-2">
                  <div className={`${bar} h-4 w-3/4`} />
                  <div className={`${bar} h-3 w-1/2`} />
                </div>
              </div>
              <div className={`${bar} mt-4 h-3 w-full`} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={`${bar} h-20 w-full rounded-2xl`} />
          ))}
        </div>
      )}
    </div>
  );
}
