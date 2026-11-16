-- Platforma nomi AdvokatKerak → AdvokatBor (domen: advokatbor.uz).
-- Seed bilan yaratilgan maʼlumot sahifalari matnidagi eski nom almashtiriladi (admin tahrirlari saqlanadi).
UPDATE "StaticPage"
SET "titleUz"       = replace("titleUz", 'AdvokatKerak', 'AdvokatBor'),
    "titleUzCyrl"   = replace("titleUzCyrl", 'AdvokatKerak', 'AdvokatBor'),
    "titleRu"       = replace("titleRu", 'AdvokatKerak', 'AdvokatBor'),
    "contentUz"     = replace(replace("contentUz", 'AdvokatKerak', 'AdvokatBor'), 'advokatkerak.uz', 'advokatbor.uz'),
    "contentUzCyrl" = replace(replace("contentUzCyrl", 'AdvokatKerak', 'AdvokatBor'), 'advokatkerak.uz', 'advokatbor.uz'),
    "contentRu"     = replace(replace("contentRu", 'AdvokatKerak', 'AdvokatBor'), 'advokatkerak.uz', 'advokatbor.uz'),
    "updatedAt"     = now()
WHERE "titleUz" LIKE '%AdvokatKerak%' OR "titleUzCyrl" LIKE '%AdvokatKerak%' OR "titleRu" LIKE '%AdvokatKerak%'
   OR "contentUz" LIKE '%AdvokatKerak%' OR "contentUzCyrl" LIKE '%AdvokatKerak%' OR "contentRu" LIKE '%AdvokatKerak%'
   OR "contentUz" LIKE '%advokatkerak.uz%' OR "contentUzCyrl" LIKE '%advokatkerak.uz%' OR "contentRu" LIKE '%advokatkerak.uz%';

-- Maqola va mavzu sahifalarida ham uchrasa
UPDATE "Article"   SET "content" = replace("content", 'AdvokatKerak', 'AdvokatBor'), "title" = replace("title", 'AdvokatKerak', 'AdvokatBor') WHERE "content" LIKE '%AdvokatKerak%' OR "title" LIKE '%AdvokatKerak%';
UPDATE "TopicPage" SET "content" = replace("content", 'AdvokatKerak', 'AdvokatBor'), "contentRu" = replace("contentRu", 'AdvokatKerak', 'AdvokatBor') WHERE "content" LIKE '%AdvokatKerak%' OR "contentRu" LIKE '%AdvokatKerak%';
