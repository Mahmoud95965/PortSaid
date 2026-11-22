import Link from 'next/link';

const SECTIONS = [
  {
    title: '١. البيانات التي نجمعها',
    body: [
      'بيانات الحساب التي تدخلها بنفسك عند التسجيل: الاسم، والبريد الإلكتروني أو رقم الهاتف، والنوع، ونوع المستخدم (طالب أو زائر أو من أبناء بورسعيد)، والمحافظة، والكلية أو الجامعة (للطالب فقط).',
      'عند الدخول بحساب Google نستلم من Google الاسم والبريد الإلكتروني فقط، لاستكمال إنشاء حسابك.',
      'تفضيلات الاستخدام داخل التطبيق، مثل الثيم (فاتح أو داكن) وتنبيهات العروض.',
    ],
  },
  {
    title: '٢. كيف نستخدم بياناتك',
    body: [
      'إنشاء حسابك وتسجيل دخولك والتعرف عليك عند زياراتك التالية.',
      'تخصيص تجربتك داخل التطبيق، مثل عرض محافظتك وتفضيلاتك.',
      'تشغيل الخدمة وتحسينها وإصلاح أي مشاكل تقنية.',
    ],
  },
  {
    title: '٣. ملفات تعريف الارتباط والجلسة',
    body: [
      'نستخدم ملف تعريف ارتباط للجلسة باسم ps_session، وهو ملف آمن لا يمكن قراءته من جافاسكربت، ويحافظ على تسجيل دخولك أثناء استخدامك للموقع.',
      'يُحفظ تفضيل الثيم الخاص بك في متصفحك فقط، ولا يُرسل إلى خوادمنا.',
      'الدخول بحساب Google يتم عبر Supabase Auth، مزوّد خدمة المصادقة، الذي يعالج بيانات الدخول وفق سياسة الخصوصية الخاصة به.',
    ],
  },
  {
    title: '٤. مشاركة البيانات',
    body: [
      'لا نبيع بياناتك ولا نشاركها مع أي طرف لأغراض إعلانية.',
      'لا نشارك بيانات حسابك مع أي طرف ثالث، إلا بالقدر اللازم تقنياً لتشغيل خدمة الدخول (Google وSupabase Auth).',
      'قوائم الأماكن والمحتوى المعروض في التطبيق يقدّمها فريق Port Said Hub، ولا تتضمن أي بيانات من حسابك.',
    ],
  },
  {
    title: '٥. أمان بياناتك',
    body: [
      'نتخذ إجراءات معقولة لحماية بيانات حسابك، وجلسة الدخول محمية بملف تعريف ارتباط آمن.',
      'لا نعرض كلمة مرورك لأي شخص، وننصحك بعدم مشاركتها مع أحد، وتغييرها فوراً إذا شككت في استخدام حسابك.',
    ],
  },
  {
    title: '٦. حقوقك والتحكم في حسابك',
    body: [
      'يمكنك تغيير كلمة مرورك في أي وقت من صفحة حسابك.',
      'يمكنك تسجيل الخروج من حسابك في أي وقت.',
      'لا تتوفر حالياً خاصية حذف الحساب من داخل التطبيق.',
      'للتواصل معنا بخصوص بياناتك، يمكنك مراسلتنا عبر حساباتنا الرسمية الموضحة أسفل الموقع (فيسبوك، إنستجرام، تيك توك).',
    ],
  },
  {
    title: '٧. التغييرات على هذه السياسة',
    body: [
      'قد نحدّث هذه السياسة من وقت لآخر، وسنوضّح تاريخ آخر تحديث أسفل هذه الصفحة. استمرارك في استخدام Port Said Hub بعد أي تحديث يعني موافقتك على السياسة المحدّثة.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main dir="rtl" className="min-h-screen">
      {/* Header */}
      <section className="hero-bg py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-snug">
            سياسة الخصوصية
          </h1>
          <p className="mt-3 text-white/80 text-sm sm:text-base leading-relaxed">
            كيف نجمع بياناتك ونستخدمها ونحميها في Port Said Hub — دليلك في بورسعيد
          </p>
          <p className="mt-4 inline-block text-xs font-bold text-sand-400 bg-white/10 border border-white/20 rounded-full px-4 py-1.5">
            آخر تحديث: ٢٢ نوفمبر ٢٠٢٦
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <article className="bg-white dark:bg-[#071322]/80 rounded-3xl border border-sand-200/80 dark:border-[#1d2d3e] shadow-sm p-6 sm:p-10">
          <p className="text-ocean-900/80 dark:text-white/80 leading-loose">
            توضّح هذه السياسة البيانات التي يجمعها Port Said Hub
            (port-said-hub.site) عند استخدامك للموقع، وكيف نستخدمها،
            وما الخيارات المتاحة لك للتحكم في حسابك. باستخدامك للخدمة،
            فأنت توافق على ما ورد في هذه السياسة.
          </p>

          {SECTIONS.map((section) => (
            <section key={section.title} className="mt-8">
              <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-black text-ocean-900 dark:text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-sand-400 shrink-0" />
                {section.title}
              </h2>
              <ul className="mt-3 space-y-2.5">
                {section.body.map((line) => (
                  <li
                    key={line}
                    className="text-ocean-900/80 dark:text-white/80 leading-loose ps-4 border-s-2 border-sand-300/70 dark:border-sand-400/30"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </article>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-bold text-ocean-700 dark:text-white bg-white dark:bg-[#121c29] border border-sand-200 dark:border-[#223246] rounded-2xl px-5 py-3 shadow-sm hover:bg-ocean-700 hover:text-white transition"
          >
            → العودة إلى الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </main>
  );
}
