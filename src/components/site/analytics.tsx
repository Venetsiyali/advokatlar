"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { GA_ID, YM_ID } from "@/lib/analytics";

/**
 * GA4 va Yandex Metrica. NEXT_PUBLIC_GA_ID / NEXT_PUBLIC_YM_ID berilmasa hech narsa yuklanmaydi.
 * Kabinet va admin sahifalarida kuzatuv oʻchirilgan (shaxsiy maʼlumotlar URL da boʻlishi mumkin).
 */
export function Analytics() {
  const pathname = usePathname();
  const private_ = /\/(kabinet|admin|baho)(\/|$)/.test(pathname);
  if ((!GA_ID && !YM_ID) || private_) return null;
  return (
    <>
      {GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config',${JSON.stringify(GA_ID)},{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {YM_ID && (
        <>
          <Script id="ym-init" strategy="afterInteractive">
            {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${Number(YM_ID)},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,defer:true});`}
          </Script>
          <YandexHits />
        </>
      )}
    </>
  );
}

/** SPA navigatsiyasida Metrica'ga sahifa koʻrishini yuborish (GA4 buni oʻzi kuzatadi) */
function YandexHits() {
  const pathname = usePathname();
  const search = useSearchParams();
  const first = useRef(true);
  useEffect(() => {
    const url = pathname + (search.size ? `?${search}` : "");
    // defer:true — birinchi koʻrish ham shu yerda yuboriladi
    window.ym?.(Number(YM_ID), "hit", url, first.current ? undefined : { referer: document.referrer });
    first.current = false;
  }, [pathname, search]);
  return null;
}
