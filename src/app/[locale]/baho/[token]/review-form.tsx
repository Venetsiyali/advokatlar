"use client";

import { useActionState, useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Field, inputCls } from "@/components/forms/fields";
import { submitReviewAction, type ReviewState } from "@/server/review-actions";
import { cn } from "@/lib/utils";

export function ReviewForm({ token }: { token: string }) {
  const t = useTranslations("review");
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReviewAction, { status: "idle" });
  const [rating, setRating] = useState(5);

  useEffect(() => {
    if (state.status === "ok") track("review_submitted", { rating });
  }, [state, rating]);

  if (state.status === "ok") return <Alert kind="success">{t("thanks")}</Alert>;

  return (
    <form action={action} className="space-y-5">
      {state.status === "error" && <Alert>{state.error === "already" ? t("already") : t("invalid")}</Alert>}
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="rating" value={rating} />
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{t("rating")}</legend>
        <div className="flex gap-1" role="radiogroup">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i}`} onClick={() => setRating(i)} className="p-1">
              <Star className={cn("size-9", i <= rating ? "fill-gold-400 text-gold-400" : "fill-navy-100 text-navy-100")} />
            </button>
          ))}
        </div>
      </fieldset>
      <Field label={t("comment")} htmlFor="rv-comment">
        <textarea id="rv-comment" name="comment" rows={4} maxLength={1000} className={cn(inputCls, "h-auto py-3")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
