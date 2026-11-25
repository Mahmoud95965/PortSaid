-- Migration 09: Google ratings for places (from the Excel file, Nov 2026)
-- Adds rating (Google score, e.g. 4.4) + ratings_count (number of Google reviews)
-- to public.places and backfills the 186 imported places from upload.xlsx.
-- The 2 imported places without a Google rating stay NULL (no fake value).
-- Run in Supabase Dashboard -> SQL Editor -> Run, AFTER merging.
-- Source file: ~/workspace/user/files/upload.xlsx (sheet 'الكل (للمبرمج)').

ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS rating numeric(3,1),
  ADD COLUMN IF NOT EXISTS ratings_count integer;

UPDATE public.places SET rating = 4.4, ratings_count = 1355 WHERE id = '30000000-0000-0000-0000-000000000001';  -- فنار بورسعيد (The Lighthouse of Port Said)
UPDATE public.places SET rating = 4.6, ratings_count = 1138 WHERE id = '30000000-0000-0000-0000-000000000002';  -- ساحة مصر
UPDATE public.places SET rating = 4.3, ratings_count = 1843 WHERE id = '30000000-0000-0000-0000-000000000003';  -- متحف بورسعيد الحربي (Port Said Military Museum)
UPDATE public.places SET rating = 4.1, ratings_count = 4312 WHERE id = '30000000-0000-0000-0000-000000000004';  -- جبل الملح (Salt Mountain)
UPDATE public.places SET rating = 4.7, ratings_count = 46 WHERE id = '30000000-0000-0000-0000-000000000006';  -- ساحه الحمام بور سعيد
UPDATE public.places SET rating = 4.4, ratings_count = 7989 WHERE id = '30000000-0000-0000-0000-000000000007';  -- Ferial Garden (حديقة فريال)
UPDATE public.places SET rating = 4, ratings_count = 1189 WHERE id = '30000000-0000-0000-0000-000000000008';  -- History Garden (حديقة التاريخ)
UPDATE public.places SET rating = 4.2, ratings_count = 3597 WHERE id = '30000000-0000-0000-0000-000000000009';  -- El-Montazah Park - حديقه المنتزه
UPDATE public.places SET rating = 4, ratings_count = 1580 WHERE id = '30000000-0000-0000-0000-000000000010';  -- حديقة الفرما (Farma Park)
UPDATE public.places SET rating = 3.9, ratings_count = 882 WHERE id = '30000000-0000-0000-0000-000000000011';  -- حديقة المنتزه - بورفؤاد (Montazah Park)
UPDATE public.places SET rating = 4.2, ratings_count = 1140 WHERE id = '30000000-0000-0000-0000-000000000012';  -- شاطئ بورسعيد
UPDATE public.places SET rating = 4.1, ratings_count = 300 WHERE id = '30000000-0000-0000-0000-000000000013';  -- Port said beach
UPDATE public.places SET rating = 4.6, ratings_count = 5 WHERE id = '30000000-0000-0000-0000-000000000014';  -- Marina beach
UPDATE public.places SET rating = 3.6, ratings_count = 5 WHERE id = '30000000-0000-0000-0000-000000000016';  -- Welcome\ Goodbye Port Said statue
UPDATE public.places SET rating = 4.3, ratings_count = 2742 WHERE id = '30000000-0000-0000-0000-000000000017';  -- سوهو سكوير (Suho Square)
UPDATE public.places SET rating = 4.1, ratings_count = 89 WHERE id = '30000000-0000-0000-0000-000000000018';  -- ملاهي فن سكوير
UPDATE public.places SET rating = 4.3, ratings_count = 16 WHERE id = '30000000-0000-0000-0000-000000000019';  -- Fun city (ملاهي فن سيتي)
UPDATE public.places SET rating = 3.5, ratings_count = 43 WHERE id = '30000000-0000-0000-0000-000000000020';  -- لونا بارك
UPDATE public.places SET rating = 3.4, ratings_count = 96 WHERE id = '30000000-0000-0000-0000-000000000021';  -- اكوا بارك سيتي مول
UPDATE public.places SET rating = 4.3, ratings_count = 9 WHERE id = '30000000-0000-0000-0000-000000000022';  -- Tele Match - ملاهي تيلي ماتش
UPDATE public.places SET rating = 4, ratings_count = 789 WHERE id = '30000000-0000-0000-0000-000000000023';  -- سينما الكروان (El Karawan Cinema)
UPDATE public.places SET rating = 4.2, ratings_count = 22 WHERE id = '30000000-0000-0000-0000-000000000024';  -- Cinematy - سينمتي
UPDATE public.places SET rating = 3.5, ratings_count = 251 WHERE id = '30000000-0000-0000-0000-000000000025';  -- سينما مصر (Misr Cinema)
UPDATE public.places SET rating = 3.4, ratings_count = 68 WHERE id = '30000000-0000-0000-0000-000000000026';  -- سينما ريو بور سعيد
UPDATE public.places SET rating = 4.2, ratings_count = 443 WHERE id = '30000000-0000-0000-0000-000000000027';  -- المركز الثقافي الترفيهي ببورسعيد
UPDATE public.places SET rating = 4.1, ratings_count = 54 WHERE id = '30000000-0000-0000-0000-000000000028';  -- Playstation GAME IIN
UPDATE public.places SET rating = 5, ratings_count = 7 WHERE id = '30000000-0000-0000-0000-000000000029';  -- Fantasy playstation
UPDATE public.places SET rating = 4.1, ratings_count = 993 WHERE id = '30000000-0000-0000-0000-000000000030';  -- نادي هواة الصيد
UPDATE public.places SET rating = 4.4, ratings_count = 66 WHERE id = '30000000-0000-0000-0000-000000000031';  -- نادى القوات البحرية
UPDATE public.places SET rating = 4.3, ratings_count = 12 WHERE id = '30000000-0000-0000-0000-000000000032';  -- Shooting Club Port Said Beach
UPDATE public.places SET rating = 4.4, ratings_count = 545 WHERE id = '30000000-0000-0000-0000-000000000033';  -- Alfa Piatto
UPDATE public.places SET rating = 4.1, ratings_count = 3580 WHERE id = '30000000-0000-0000-0000-000000000034';  -- Ibn Hamido Seafood Restaurant
UPDATE public.places SET rating = 4.2, ratings_count = 1473 WHERE id = '30000000-0000-0000-0000-000000000035';  -- Portofish
UPDATE public.places SET rating = 4.8, ratings_count = 354 WHERE id = '30000000-0000-0000-0000-000000000036';  -- دكن
UPDATE public.places SET rating = 3.9, ratings_count = 415 WHERE id = '30000000-0000-0000-0000-000000000037';  -- مطعم الخديوي فرع محمد علي بورسعيد
UPDATE public.places SET rating = 3.8, ratings_count = 944 WHERE id = '30000000-0000-0000-0000-000000000038';  -- مطعم الخديوي فرع الشاطئ
UPDATE public.places SET rating = 3.8, ratings_count = 665 WHERE id = '30000000-0000-0000-0000-000000000039';  -- مطعم الخديوي
UPDATE public.places SET rating = 4.2, ratings_count = 1373 WHERE id = '30000000-0000-0000-0000-000000000040';  -- عالم البحار
UPDATE public.places SET rating = 4.3, ratings_count = 255 WHERE id = '30000000-0000-0000-0000-000000000041';  -- Hook Sea Food Restaurant مطعم هوك للاسماك
UPDATE public.places SET rating = 4.2, ratings_count = 803 WHERE id = '30000000-0000-0000-0000-000000000042';  -- مطعم كاجو للماكولات البحرية
UPDATE public.places SET rating = 4, ratings_count = 1496 WHERE id = '30000000-0000-0000-0000-000000000043';  -- El Kastan Fish Restaurant الكاستن
UPDATE public.places SET rating = 4, ratings_count = 270 WHERE id = '30000000-0000-0000-0000-000000000044';  -- الجندي للمأكولات البحرية
UPDATE public.places SET rating = 4, ratings_count = 224 WHERE id = '30000000-0000-0000-0000-000000000045';  -- Azooz Seafood
UPDATE public.places SET rating = 3.9, ratings_count = 99 WHERE id = '30000000-0000-0000-0000-000000000046';  -- مطعم المتولي فول وفلافل
UPDATE public.places SET rating = 4.4, ratings_count = 619 WHERE id = '30000000-0000-0000-0000-000000000047';  -- Elgabas Restaurant
UPDATE public.places SET rating = 4.1, ratings_count = 269 WHERE id = '30000000-0000-0000-0000-000000000048';  -- مطعم المصرى
UPDATE public.places SET rating = 4.2, ratings_count = 60 WHERE id = '30000000-0000-0000-0000-000000000049';  -- مطعم ابو العز &ضياء
UPDATE public.places SET rating = 4.1, ratings_count = 128 WHERE id = '30000000-0000-0000-0000-000000000050';  -- ibnyahiarestaurant
UPDATE public.places SET rating = 3.8, ratings_count = 1243 WHERE id = '30000000-0000-0000-0000-000000000051';  -- كشري شوقي للكشري و المعجنات
UPDATE public.places SET rating = 3.4, ratings_count = 195 WHERE id = '30000000-0000-0000-0000-000000000052';  -- كشري هند
UPDATE public.places SET rating = 4.8, ratings_count = 2646 WHERE id = '30000000-0000-0000-0000-000000000053';  -- Moodz Burger (فرع الشرق)
UPDATE public.places SET rating = 4.5, ratings_count = 1882 WHERE id = '30000000-0000-0000-0000-000000000054';  -- Moodz Burger (طرح البحر - عبد السلام عارف)
UPDATE public.places SET rating = 4.6, ratings_count = 117 WHERE id = '30000000-0000-0000-0000-000000000055';  -- Buns
UPDATE public.places SET rating = 4.6, ratings_count = 85 WHERE id = '30000000-0000-0000-0000-000000000056';  -- High Burger (محمد علي - طرح البحر)
UPDATE public.places SET rating = 4.6, ratings_count = 2967 WHERE id = '30000000-0000-0000-0000-000000000057';  -- High Burger (عاطف السادات - خلف إستاد المصري)
UPDATE public.places SET rating = 4.5, ratings_count = 16 WHERE id = '30000000-0000-0000-0000-000000000058';  -- Pizza & Pasta
UPDATE public.places SET rating = 4.7, ratings_count = 881 WHERE id = '30000000-0000-0000-0000-000000000059';  -- Big Pizza
UPDATE public.places SET rating = 4.1, ratings_count = 380 WHERE id = '30000000-0000-0000-0000-000000000060';  -- بيتزا روكا بورسعيد
UPDATE public.places SET rating = 4, ratings_count = 126 WHERE id = '30000000-0000-0000-0000-000000000061';  -- Chicago pizza
UPDATE public.places SET rating = 3.8, ratings_count = 287 WHERE id = '30000000-0000-0000-0000-000000000062';  -- كبابجي التميمي بورسعيد
UPDATE public.places SET rating = 3.9, ratings_count = 804 WHERE id = '30000000-0000-0000-0000-000000000063';  -- كبابجي الوهيبي ش السوق
UPDATE public.places SET rating = 2.9, ratings_count = 28 WHERE id = '30000000-0000-0000-0000-000000000064';  -- البسيوني الكبابجي
UPDATE public.places SET rating = 4.2, ratings_count = 44 WHERE id = '30000000-0000-0000-0000-000000000065';  -- كبابجي الداوي
UPDATE public.places SET rating = 4.2, ratings_count = 211 WHERE id = '30000000-0000-0000-0000-000000000066';  -- Mr Mshawy مطعم مستر مشاوى
UPDATE public.places SET rating = 4.2, ratings_count = 46 WHERE id = '30000000-0000-0000-0000-000000000067';  -- The Grill House
UPDATE public.places SET rating = 4.1, ratings_count = 1279 WHERE id = '30000000-0000-0000-0000-000000000068';  -- عبدة كفتة Abdou Kofta
UPDATE public.places SET rating = 3.9, ratings_count = 413 WHERE id = '30000000-0000-0000-0000-000000000069';  -- Al-Zanaty Grill House & Restaurant
UPDATE public.places SET rating = 4.2, ratings_count = 218 WHERE id = '30000000-0000-0000-0000-000000000070';  -- طعم زمان
UPDATE public.places SET rating = 4.2, ratings_count = 184 WHERE id = '30000000-0000-0000-0000-000000000071';  -- Bity/مطعم بيتي
UPDATE public.places SET rating = 4.7, ratings_count = 157 WHERE id = '30000000-0000-0000-0000-000000000072';  -- بوخارست بلاك فرع بورسعيد
UPDATE public.places SET rating = 3.6, ratings_count = 54 WHERE id = '30000000-0000-0000-0000-000000000073';  -- Spazio restaurant&cafe - port said
UPDATE public.places SET rating = 4.4, ratings_count = 199 WHERE id = '30000000-0000-0000-0000-000000000074';  -- Avenue restaurant & cafe
UPDATE public.places SET rating = 4.3, ratings_count = 321 WHERE id = '30000000-0000-0000-0000-000000000075';  -- Opera Town Lounge
UPDATE public.places SET rating = 4.2, ratings_count = 230 WHERE id = '30000000-0000-0000-0000-000000000076';  -- اللورد السوري
UPDATE public.places SET rating = 3.4, ratings_count = 64 WHERE id = '30000000-0000-0000-0000-000000000077';  -- راشد السوري
UPDATE public.places SET rating = 2.9, ratings_count = 22 WHERE id = '30000000-0000-0000-0000-000000000078';  -- مطعم الجوهرة الشامية للمأكولات السورية بور سعيد
UPDATE public.places SET rating = 4.3, ratings_count = 153 WHERE id = '30000000-0000-0000-0000-000000000079';  -- جراند شاورما بور فؤاد
UPDATE public.places SET rating = 3.8, ratings_count = 65 WHERE id = '30000000-0000-0000-0000-000000000080';  -- الدمشقي
UPDATE public.places SET rating = 4.9, ratings_count = 76 WHERE id = '30000000-0000-0000-0000-000000000081';  -- Dragon chopsticks
UPDATE public.places SET rating = 3.7, ratings_count = 76 WHERE id = '30000000-0000-0000-0000-000000000082';  -- Brost Altaza
UPDATE public.places SET rating = 4.1, ratings_count = 76 WHERE id = '30000000-0000-0000-0000-000000000083';  -- Turbo fried chicken
UPDATE public.places SET rating = 4.3, ratings_count = 16 WHERE id = '30000000-0000-0000-0000-000000000084';  -- مطعم بوديز فرايد شكن اند برجر
UPDATE public.places SET rating = 4.1, ratings_count = 301 WHERE id = '30000000-0000-0000-0000-000000000085';  -- دجاج زرمبة فرع نادي الجمارك
UPDATE public.places SET rating = 4.8, ratings_count = 699 WHERE id = '30000000-0000-0000-0000-000000000086';  -- Kufta
UPDATE public.places SET rating = 3.9, ratings_count = 626 WHERE id = '30000000-0000-0000-0000-000000000087';  -- Heart Attack
UPDATE public.places SET rating = 3.6, ratings_count = 583 WHERE id = '30000000-0000-0000-0000-000000000088';  -- KFC | Port Said Tarh El Bahr
UPDATE public.places SET rating = 4.8, ratings_count = 2231 WHERE id = '30000000-0000-0000-0000-000000000089';  -- Oldies comfort food
UPDATE public.places SET rating = 4.9, ratings_count = 4303 WHERE id = '30000000-0000-0000-0000-000000000090';  -- Brooklyn’s
UPDATE public.places SET rating = 4, ratings_count = 377 WHERE id = '30000000-0000-0000-0000-000000000091';  -- Makane Cafe
UPDATE public.places SET rating = 4.4, ratings_count = 923 WHERE id = '30000000-0000-0000-0000-000000000092';  -- Central Perk
UPDATE public.places SET rating = 4.7, ratings_count = 172 WHERE id = '30000000-0000-0000-0000-000000000093';  -- Rankers espresso
UPDATE public.places SET rating = 4.6, ratings_count = 240 WHERE id = '30000000-0000-0000-0000-000000000094';  -- Taby’s Cafe
UPDATE public.places SET rating = 4.8, ratings_count = 167 WHERE id = '30000000-0000-0000-0000-000000000095';  -- The White Noise Effect
UPDATE public.places SET rating = 5, ratings_count = 12 WHERE id = '30000000-0000-0000-0000-000000000096';  -- Crowd specialty coffee
UPDATE public.places SET rating = 4.4, ratings_count = 578 WHERE id = '30000000-0000-0000-0000-000000000097';  -- جلال كافيه
UPDATE public.places SET rating = 4.8, ratings_count = 37 WHERE id = '30000000-0000-0000-0000-000000000098';  -- Windy Café
UPDATE public.places SET rating = 4.6, ratings_count = 56 WHERE id = '30000000-0000-0000-0000-000000000099';  -- Cavio cafe
UPDATE public.places SET rating = 3.8, ratings_count = 380 WHERE id = '30000000-0000-0000-0000-000000000100';  -- Cafe Abu zaid beach
UPDATE public.places SET rating = 4.3, ratings_count = 32 WHERE id = '30000000-0000-0000-0000-000000000101';  -- Elmandra Cafe & restaurant -المندره كافيه بورسعيد
UPDATE public.places SET rating = 4.3, ratings_count = 2632 WHERE id = '30000000-0000-0000-0000-000000000102';  -- دعيه بيتش (Doaiah Beach & Kite Club)
UPDATE public.places SET rating = 4.2, ratings_count = 204 WHERE id = '30000000-0000-0000-0000-000000000103';  -- Toledo Cafe (المناخ)
UPDATE public.places SET rating = 3.9, ratings_count = 342 WHERE id = '30000000-0000-0000-0000-000000000104';  -- Toledo cafe (بورفؤاد)
UPDATE public.places SET rating = 4.4, ratings_count = 637 WHERE id = '30000000-0000-0000-0000-000000000105';  -- فرغلي فروت
UPDATE public.places SET rating = 4.3, ratings_count = 132 WHERE id = '30000000-0000-0000-0000-000000000106';  -- سموزي براديس
UPDATE public.places SET rating = 4.4, ratings_count = 6133 WHERE id = '30000000-0000-0000-0000-000000000107';  -- معصرة سلسبيلا (Salsabila)
UPDATE public.places SET rating = 4.8, ratings_count = 8 WHERE id = '30000000-0000-0000-0000-000000000108';  -- عصائر وفواكه أبو عمر
UPDATE public.places SET rating = 4.8, ratings_count = 657 WHERE id = '30000000-0000-0000-0000-000000000109';  -- معصرة كراويه
UPDATE public.places SET rating = 4.3, ratings_count = 143 WHERE id = '30000000-0000-0000-0000-000000000110';  -- معصرة عجوة
UPDATE public.places SET rating = 3.9, ratings_count = 11 WHERE id = '30000000-0000-0000-0000-000000000111';  -- جلال كافيه فرع الجراج
UPDATE public.places SET rating = 4.5, ratings_count = 148 WHERE id = '30000000-0000-0000-0000-000000000112';  -- Lord pastries shop
UPDATE public.places SET rating = 4.2, ratings_count = 1134 WHERE id = '30000000-0000-0000-0000-000000000113';  -- حلوانى سامى سالم
UPDATE public.places SET rating = 4.4, ratings_count = 134 WHERE id = '30000000-0000-0000-0000-000000000114';  -- حلوانى سامى سالم (فرع الصباح)
UPDATE public.places SET rating = 4.1, ratings_count = 354 WHERE id = '30000000-0000-0000-0000-000000000115';  -- حلواني عبده سالم
UPDATE public.places SET rating = 4.5, ratings_count = 719 WHERE id = '30000000-0000-0000-0000-000000000116';  -- Chimney Cake
UPDATE public.places SET rating = 4.3, ratings_count = 628 WHERE id = '30000000-0000-0000-0000-000000000117';  -- Ice Land Cafe
UPDATE public.places SET rating = 4.5, ratings_count = 154 WHERE id = '30000000-0000-0000-0000-000000000118';  -- نوتى نوتيلا
UPDATE public.places SET rating = 4.3, ratings_count = 378 WHERE id = '30000000-0000-0000-0000-000000000119';  -- مخبز سان جورج بورسعيد
UPDATE public.places SET rating = 4.6, ratings_count = 891 WHERE id = '30000000-0000-0000-0000-000000000120';  -- Taby’s bakery
UPDATE public.places SET rating = 4, ratings_count = 4340 WHERE id = '30000000-0000-0000-0000-000000000121';  -- السوق التجاري ببورسعيد
UPDATE public.places SET rating = 4, ratings_count = 203 WHERE id = '30000000-0000-0000-0000-000000000122';  -- الفرما مول (Farma mall)
UPDATE public.places SET rating = 3.7, ratings_count = 921 WHERE id = '30000000-0000-0000-0000-000000000123';  -- Sun Mall
UPDATE public.places SET rating = 4, ratings_count = 71 WHERE id = '30000000-0000-0000-0000-000000000124';  -- City Mall - سيتي مول
UPDATE public.places SET rating = 3.6, ratings_count = 411 WHERE id = '30000000-0000-0000-0000-000000000125';  -- El-Noras Grand Mall النورس جراند مول
UPDATE public.places SET rating = 4.2, ratings_count = 7532 WHERE id = '30000000-0000-0000-0000-000000000126';  -- سوق السمك الجديد (Port Said Fish Market)
UPDATE public.places SET rating = 4.6, ratings_count = 96 WHERE id = '30000000-0000-0000-0000-000000000127';  -- Arab DownTown - هايبر داون تاون العرب
UPDATE public.places SET rating = 4.2, ratings_count = 423 WHERE id = '30000000-0000-0000-0000-000000000128';  -- هايبر محمود الفار ارض الجولف
UPDATE public.places SET rating = 4, ratings_count = 1796 WHERE id = '30000000-0000-0000-0000-000000000129';  -- محمود الفار فرع مرحبا
UPDATE public.places SET rating = 5, ratings_count = 1 WHERE id = '30000000-0000-0000-0000-000000000130';  -- هايبر الشرق
UPDATE public.places SET rating = 4.7, ratings_count = 24 WHERE id = '30000000-0000-0000-0000-000000000131';  -- هايبر اسواق ستار فرع الحريه
UPDATE public.places SET rating = 4.9, ratings_count = 88 WHERE id = '30000000-0000-0000-0000-000000000132';  -- Palais Des Parfums قصر العطور ببورسعيد
UPDATE public.places SET rating = 4.6, ratings_count = 22 WHERE id = '30000000-0000-0000-0000-000000000133';  -- بلو بيرد (Blue Bird)
UPDATE public.places SET rating = 4, ratings_count = 6 WHERE id = '30000000-0000-0000-0000-000000000134';  -- Pretty You
UPDATE public.places SET rating = 5, ratings_count = 1 WHERE id = '30000000-0000-0000-0000-000000000135';  -- Je t`aime
UPDATE public.places SET rating = 4.2, ratings_count = 33 WHERE id = '30000000-0000-0000-0000-000000000136';  -- ريحانه - Rehana
UPDATE public.places SET rating = 4.7, ratings_count = 74 WHERE id = '30000000-0000-0000-0000-000000000137';  -- شركة بانسيه بورسعيد لخدمات المحمول
UPDATE public.places SET rating = 4.1, ratings_count = 86 WHERE id = '30000000-0000-0000-0000-000000000138';  -- Time Mobile
UPDATE public.places SET rating = 4.7, ratings_count = 23 WHERE id = '30000000-0000-0000-0000-000000000139';  -- شركة الأمير موبايل - AlAmir Mobiles company
UPDATE public.places SET rating = 4.7, ratings_count = 31 WHERE id = '30000000-0000-0000-0000-000000000140';  -- Mobile City
UPDATE public.places SET rating = 4.7, ratings_count = 42 WHERE id = '30000000-0000-0000-0000-000000000141';  -- شركة الباشا لتجارة المحمول (Elbasha star)
UPDATE public.places SET rating = 4.1, ratings_count = 15 WHERE id = '30000000-0000-0000-0000-000000000142';  -- The Gift
UPDATE public.places SET rating = 4.1, ratings_count = 48 WHERE id = '30000000-0000-0000-0000-000000000143';  -- محلات بوليكا للهدايا والعطور
UPDATE public.places SET rating = 4.3, ratings_count = 29 WHERE id = '30000000-0000-0000-0000-000000000144';  -- collection store
UPDATE public.places SET rating = 5, ratings_count = 1 WHERE id = '30000000-0000-0000-0000-000000000145';  -- Gado store
UPDATE public.places SET rating = 5, ratings_count = 1 WHERE id = '30000000-0000-0000-0000-000000000146';  -- MB Gift store
UPDATE public.places SET rating = 4.1, ratings_count = 140 WHERE id = '30000000-0000-0000-0000-000000000147';  -- Dima (الجمهورية)
UPDATE public.places SET rating = 4.3, ratings_count = 19 WHERE id = '30000000-0000-0000-0000-000000000148';  -- Dima (الثلاثيني)
UPDATE public.places SET rating = 4, ratings_count = 223 WHERE id = '30000000-0000-0000-0000-000000000149';  -- GEDO MAHMOUD
UPDATE public.places SET rating = 3.3, ratings_count = 1220 WHERE id = '30000000-0000-0000-0000-000000000150';  -- اسواق حمام Outlet
UPDATE public.places SET rating = 3.9, ratings_count = 136 WHERE id = '30000000-0000-0000-0000-000000000151';  -- Via ROMA
UPDATE public.places SET rating = 4.1, ratings_count = 143 WHERE id = '30000000-0000-0000-0000-000000000152';  -- شحتة سنتر/Shehta Center
UPDATE public.places SET rating = 4.9, ratings_count = 41 WHERE id = '30000000-0000-0000-0000-000000000153';  -- zain clothes store
UPDATE public.places SET rating = 4.4, ratings_count = 69 WHERE id = '30000000-0000-0000-0000-000000000154';  -- Mines Wear Store
UPDATE public.places SET rating = 4.9, ratings_count = 11 WHERE id = '30000000-0000-0000-0000-000000000155';  -- LAVITO
UPDATE public.places SET rating = 4.5, ratings_count = 24 WHERE id = '30000000-0000-0000-0000-000000000156';  -- LAVITO Casual wear
UPDATE public.places SET rating = 5, ratings_count = 2 WHERE id = '30000000-0000-0000-0000-000000000157';  -- lucci menswear
UPDATE public.places SET rating = 3.8, ratings_count = 89 WHERE id = '30000000-0000-0000-0000-000000000158';  -- Ibrahem Khoder group
UPDATE public.places SET rating = 4.2, ratings_count = 16 WHERE id = '30000000-0000-0000-0000-000000000159';  -- Elmatary Men’s Store
UPDATE public.places SET rating = 4.7, ratings_count = 18 WHERE id = '30000000-0000-0000-0000-000000000160';  -- G&H للملابس
UPDATE public.places SET rating = 3.9, ratings_count = 87 WHERE id = '30000000-0000-0000-0000-000000000161';  -- Disney Kids Clothes
UPDATE public.places SET rating = 3.8, ratings_count = 47 WHERE id = '30000000-0000-0000-0000-000000000162';  -- Reem Center
UPDATE public.places SET rating = 5, ratings_count = 3 WHERE id = '30000000-0000-0000-0000-000000000163';  -- محل ملابس اطفال Totymozy.kids
UPDATE public.places SET rating = 5, ratings_count = 12 WHERE id = '30000000-0000-0000-0000-000000000164';  -- Motchi.shoes
UPDATE public.places SET rating = 3.9, ratings_count = 27 WHERE id = '30000000-0000-0000-0000-000000000165';  -- Next shoes
UPDATE public.places SET rating = 5, ratings_count = 1 WHERE id = '30000000-0000-0000-0000-000000000166';  -- ديما للاحذيه و الشنط
UPDATE public.places SET rating = 4.4, ratings_count = 7 WHERE id = '30000000-0000-0000-0000-000000000167';  -- Solly
UPDATE public.places SET rating = 4.9, ratings_count = 7 WHERE id = '30000000-0000-0000-0000-000000000168';  -- Ghandar shoes
UPDATE public.places SET rating = 5, ratings_count = 18 WHERE id = '30000000-0000-0000-0000-000000000169';  -- EL-BATAL GYM
UPDATE public.places SET rating = 4.8, ratings_count = 82 WHERE id = '30000000-0000-0000-0000-000000000170';  -- Vector Gym
UPDATE public.places SET rating = 4.6, ratings_count = 29 WHERE id = '30000000-0000-0000-0000-000000000171';  -- Seven Gym
UPDATE public.places SET rating = 4.4, ratings_count = 19 WHERE id = '30000000-0000-0000-0000-000000000172';  -- TOMA GYM توما چيم
UPDATE public.places SET rating = 4.7, ratings_count = 31 WHERE id = '30000000-0000-0000-0000-000000000173';  -- 111 Gym & Spa
UPDATE public.places SET rating = 4.6, ratings_count = 5 WHERE id = '30000000-0000-0000-0000-000000000174';  -- Gym Station
UPDATE public.places SET rating = 4.8, ratings_count = 133 WHERE id = '30000000-0000-0000-0000-000000000175';  -- BRX GYM
UPDATE public.places SET rating = 4.4, ratings_count = 72 WHERE id = '30000000-0000-0000-0000-000000000176';  -- Maximum Gym ماكسيمم جيم
UPDATE public.places SET rating = 4.7, ratings_count = 38 WHERE id = '30000000-0000-0000-0000-000000000177';  -- Healthy body gym
UPDATE public.places SET rating = 5, ratings_count = 13 WHERE id = '30000000-0000-0000-0000-000000000178';  -- PadZone - Portsaid
UPDATE public.places SET rating = 5, ratings_count = 5 WHERE id = '30000000-0000-0000-0000-000000000179';  -- STYLE PADEL
UPDATE public.places SET rating = 4.4, ratings_count = 349 WHERE id = '30000000-0000-0000-0000-000000000180';  -- Shooting Club Portsaid
UPDATE public.places SET rating = 4.3, ratings_count = 182 WHERE id = '30000000-0000-0000-0000-000000000181';  -- NADY EL SAID PORTSAID (نادي الصيد)
UPDATE public.places SET rating = 4, ratings_count = 463 WHERE id = '30000000-0000-0000-0000-000000000182';  -- نادي بورفؤاد الرياضي (Port Fouad Sports Club)
UPDATE public.places SET rating = 4.2, ratings_count = 1157 WHERE id = '30000000-0000-0000-0000-000000000183';  -- Marom Port Said Resort & Beach
UPDATE public.places SET rating = 4.1, ratings_count = 464 WHERE id = '30000000-0000-0000-0000-000000000184';  -- Helnan portsaid beach
UPDATE public.places SET rating = 4.1, ratings_count = 2115 WHERE id = '30000000-0000-0000-0000-000000000185';  -- قرية النورس (Ganat AL Noras Resort)
UPDATE public.places SET rating = 3.7, ratings_count = 135 WHERE id = '30000000-0000-0000-0000-000000000186';  -- ألف ليلة وليلة اكوابارك بورسعيد

-- Backfilled: 184 places (2 without a Google rating stay NULL).
SELECT count(*) AS places_with_rating FROM public.places WHERE rating IS NOT NULL;
