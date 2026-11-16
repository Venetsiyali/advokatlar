"use client";

import * as A from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  return (
    <A.Root type="single" collapsible className="divide-y divide-navy-100 rounded-2xl border border-navy-100 bg-white shadow-soft">
      {items.map((it, i) => (
        <A.Item key={i} value={`i${i}`}>
          <A.Header>
            <A.Trigger className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-navy-900 hover:bg-navy-50/50">
              {it.q}
              <ChevronDown className="size-5 shrink-0 text-navy-500 transition-transform group-data-[state=open]:rotate-180" />
            </A.Trigger>
          </A.Header>
          <A.Content className="overflow-hidden px-5 pb-4 text-sm leading-relaxed text-slate-600">{it.a}</A.Content>
        </A.Item>
      ))}
    </A.Root>
  );
}
