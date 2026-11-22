import Link from 'next/link';

const SECTIONS = [
  {
    title: '١. ما هو Port Said Hub',
    body: [
      'Port Said Hub (port-said-hub.site) هو دليل رقمي لمدينة بورسعيد، يساعدك على اكتشاف المطاعم والكافيهات، والمواصلات، والسكن والفنادق، وأماكن الخروج والترفيه، والتسوق وغيرها.',
      'قوائم الأماكن والمحتوى المعروض في التطبيق يقدّمها فريق Port Said Hub.',
    ],
  },
  {
    title: '٢. من يمكنه استخدام الخدمة',
    body: [
      'الخدمة متاحة للجميع لتصفح الأدلة والأماكن.',
      'إنشاء حساب يتطلب إدخال بيانات صحيحة، ويمنحك تجربة مخصصة داخل التطبيق.',
    ],
  },
  {
    title: '٣. حسابك ومسؤوليتك',
    body: [
      'أنت مسؤول عن دقة البيانات التي تدخلها عند التسجيل.',
      'حافظ على سرية كلمة مرورك، ولا تشاركها مع أي شخص، وغيّرها فوراً إذا شككت في استخدام حسابك.',
      'أنت مسؤول عن أي نشاط يتم من خلال حسابك.',
    ],
  },
  {
    title: '٤. الاستخدام المقبول',
    body: [
      'استخدم الخدمة للأغراض المشروعة فقط.',
      'لا تحاول تعطيل الخدمة أو الوصول إلى أي جزء منها بطرق غير مصرّح بها.',
      'لا تنشر أو ترسل معلومات غير صحيحة أو مضللة من خلال الخدمة.',
    ],
  },
  {
    title: '٥. دقة المعلومات',
    body: [
      'نعرض معلومات الأماكن (مثل الأسعار والمواعيد والعناوين) كما تصلنا، وقد تتغير في أي وقت دون إشعار.',
      'لا نضمن دقة جميع المعلومات المعروضة بشكل كامل، وننصحك بالتأكد من المكان مباشرة قبل الاعتماد عليها.',
    ],
  },
  {
    title: '٦. خدمات وأماكن طرف ثالث',
    body: [
      'المطاعم والأماكن والخدمات المعروضة في الدليل هي جهات مستقلة عن Port Said Hub.',
      'لا نضمن جودة خدمات هذه الجهات، ولا نتحمل مسؤولية تعاملاتك معها أو أي تجربة سلبية قد تحدث لديها.',
    ],
  },
  {
    title: '٧. حدود المسؤولية',
    body: [
      'الخدمة تُقدَّم "كما هي" دون أي ضمانات من أي نوع.',
      'لا نتحمل مسؤولية أي أضرار مباشرة أو غير مباشرة قد تنتج عن استخدامك للخدمة، أو عن الاعتماد على معلومات معروضة فيها، أو عن خدمات طرف ثالث، وذلك بالحد الأقصى الذي يسمح به القانون.',
    ],
  },
  {
    title: '٨. تغيير الشروط',
    body: [
      'قد نحدّث هذه الشروط من وقت لآخر، وسنوضّح تاريخ آخر تحديث أسفل هذه الصفحة. استمرارك في استخدام Port Said Hub بعد أي تحديث يعني موافقتك على الشروط المحدّثة.',
    ],
  },
];

export default function TermsPage() {
  return (
    <main dir="rtl" className="min-h-screen">
      {/* Header */}
      <section className="hero-bg py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-snug">
            شروط الاستخدام
          </h1>
          <p className="mt-3 text-white/80 text-sm sm:text-base leading-relaxed">
            القواعد التي تحكم استخدامك لـ Port Said Hub وحسابك فيه
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
            باستخدامك لموقع Port Said Hub (port-said-hub.site)، فأنت توافق
            على هذه الشروط. إذا لم توافق على أي بند فيها، فيرجى عدم
            استخدام الخدمة.
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
