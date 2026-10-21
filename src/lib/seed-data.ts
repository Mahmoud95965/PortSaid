import { Place, Category, TransportLine, ExploreItem } from './types';

export const SEED_CATEGORIES: Category[] = [
  { id: 1, code: 'explore', name_ar: 'استكشف بورسعيد', icon: 'Compass', color: 'bg-amber-100 text-amber-900' },
  { id: 2, code: 'fun', name_ar: 'معالم وترفيه', icon: 'Star', color: 'bg-amber-400 text-amber-950' },
  { id: 3, code: 'food', name_ar: 'مطاعم', icon: 'Utensils', color: 'bg-teal-600 text-white' },
  { id: 4, code: 'cafe', name_ar: 'كافيهات', icon: 'Coffee', color: 'bg-slate-900 text-white' },
  { id: 5, code: 'sweets', name_ar: 'حلويات', icon: 'IceCream', color: 'bg-rose-500 text-white' },
  { id: 6, code: 'shop', name_ar: 'تسوق', icon: 'ShoppingBag', color: 'bg-blue-600 text-white' },
  { id: 7, code: 'sport', name_ar: 'رياضة', icon: 'Dumbbell', color: 'bg-emerald-600 text-white' },
  { id: 8, code: 'housing', name_ar: 'سكن (شقق)', icon: 'Bed', color: 'bg-orange-500 text-white' },
  { id: 9, code: 'bus', name_ar: 'مواصلات', icon: 'Bus', color: 'bg-sky-700 text-white' },
  { id: 10, code: 'hotels', name_ar: 'الأوتيلات والفنادق', icon: 'Hotel', color: 'bg-indigo-600 text-white' },
];

export const SEED_PLACES: Place[] = [
  {
    id: '11111111-1111-1111-1111-111111111101',
    category_id: 2,
    name_ar: 'فنار بورسعيد التاريخي',
    area_ar: 'حي الشرق',
    description_ar: 'أول فنار في العالم يُبنى بالخرسانة المسلحة، معلم تاريخي فريد عند مدخل قناة السويس.',
    latitude: 31.2652880,
    longitude: 32.3023020,
    visit_points: 50,
    discount_percent: 0,
    coupon_cost_points: 0,
    commission_amount: 0,
    checkin_radius_m: 150,
    status: 'active'
  },
  {
    id: '11111111-1111-1111-1111-111111111102',
    category_id: 2,
    name_ar: 'ممشى ديليسبس وقناة السويس',
    area_ar: 'حي الشرق',
    description_ar: 'ممشى سياحي شهير لمشاهدة السفن العابرة لقناة السويس وجسر النصر وبورفؤاد.',
    latitude: 31.2585000,
    longitude: 32.3087000,
    visit_points: 30,
    discount_percent: 0,
    coupon_cost_points: 0,
    commission_amount: 0,
    checkin_radius_m: 150,
    status: 'active'
  },
  {
    id: '11111111-1111-1111-1111-111111111103',
    category_id: 2,
    name_ar: 'مسجد السلام الكبير',
    area_ar: 'حي الشرق',
    description_ar: 'من أكبر وأشهر مساجد بورسعيد بطراز معماري إسلامي متميز.',
    latitude: 31.2641000,
    longitude: 32.3052000,
    visit_points: 25,
    discount_percent: 0,
    coupon_cost_points: 0,
    commission_amount: 0,
    checkin_radius_m: 150,
    status: 'active'
  },
  {
    id: '11111111-1111-1111-1111-111111111104',
    category_id: 3,
    name_ar: 'مطعم كاستن للأسماك',
    area_ar: 'حي الشرق',
    description_ar: 'أحد أعرق وأشهر مطاعم الأسماك والمأكولات البحرية الطازجة في بورسعيد.',
    latitude: 31.2612000,
    longitude: 32.3041000,
    visit_points: 20,
    discount_percent: 15,
    coupon_cost_points: 60,
    commission_amount: 10,
    checkin_radius_m: 150,
    status: 'active'
  },
  {
    id: '11111111-1111-1111-1111-111111111105',
    category_id: 3,
    name_ar: 'مطعم ومأكولات الجندي البحرية',
    area_ar: 'حي العرب',
    description_ar: 'أسماك وفواكه بحر بورسعيدية بطعم بلدي أصيل وأسعار مميزة للطلبة.',
    latitude: 31.2568000,
    longitude: 32.2954000,
    visit_points: 20,
    discount_percent: 12,
    coupon_cost_points: 50,
    commission_amount: 8,
    checkin_radius_m: 150,
    status: 'active'
  },
  {
    id: '11111111-1111-1111-1111-111111111106',
    category_id: 4,
    name_ar: 'كافيه بينوس ممشى القناة',
    area_ar: 'حي الشرق',
    description_ar: 'إطلالة مباشرة على المجرى الملاحي لقناة السويس مع مشروبات وقهوة مميزة.',
    latitude: 31.2592000,
    longitude: 32.3078000,
    visit_points: 15,
    discount_percent: 10,
    coupon_cost_points: 40,
    commission_amount: 5,
    checkin_radius_m: 150,
    status: 'active'
  },
  {
    id: '11111111-1111-1111-1111-111111111107',
    category_id: 5,
    name_ar: 'حلويات سيلفر وكاساتا بورسعيد',
    area_ar: 'حي العرب',
    description_ar: 'أشهر كاساتا وحلويات بورسعيدية بطعم لا يُنسى.',
    latitude: 31.2581000,
    longitude: 32.2982000,
    visit_points: 15,
    discount_percent: 10,
    coupon_cost_points: 40,
    commission_amount: 5,
    checkin_radius_m: 150,
    status: 'active'
  },
  {
    id: '11111111-1111-1111-1111-111111111108',
    category_id: 6,
    name_ar: 'سوق السمك الحضاري الجديد',
    area_ar: 'حي العرب',
    description_ar: 'سوق عصري متكامل لشراء وشوي أشهى الأسماك البورسعيدية فورًا.',
    latitude: 31.2543000,
    longitude: 32.2912000,
    visit_points: 25,
    discount_percent: 10,
    coupon_cost_points: 45,
    commission_amount: 5,
    checkin_radius_m: 150,
    status: 'active'
  },
  {
    id: '11111111-1111-1111-1111-111111111109',
    category_id: 8,
    name_ar: 'سكن طلبة حي الشرق المتميز',
    area_ar: 'حي الشرق',
    description_ar: 'غرف مفروشة وقريبة من المواصلات والممشى، إنترنت سريع وأمن.',
    latitude: 31.2625000,
    longitude: 32.3015000,
    visit_points: 0,
    discount_percent: 0,
    coupon_cost_points: 0,
    commission_amount: 0,
    checkin_radius_m: 150,
    status: 'active'
  },
  {
    id: '11111111-1111-1111-1111-111111111110',
    category_id: 8,
    name_ar: 'سكن طالبات حي الزهور',
    area_ar: 'حي الزهور',
    description_ar: 'شقق هادئة بالقرب من مجمع كليات الطب والصيدلة والعلاج الطبيعي.',
    latitude: 31.2480000,
    longitude: 32.2780000,
    visit_points: 0,
    discount_percent: 0,
    coupon_cost_points: 0,
    commission_amount: 0,
    checkin_radius_m: 150,
    status: 'active'
  }
];

export const SEED_LINES: TransportLine[] = [
  {
    id: 1,
    name_ar: 'الأمين',
    details_ar: 'خط رئيسي يربط المعدية بكليات التكنولوجيا والحقوق ومعهد الحاسب الآلي',
    stops: ['المعدية / السكن الجامعي', 'قصر الثقافة', 'معهد الحاسب الآلي', 'كلية التكنولوجيا والحقوق', 'بنك الإسكان', 'السلام', 'قسم الضواحي', 'الحريتين', 'شارع التلاتيني', 'المنشية']
  },
  {
    id: 2,
    name_ar: 'الزهور',
    details_ar: 'خط كليات الطب والعلاج الطبيعي والصيدلة مرورًا بشارع النصر',
    stops: ['قصر الثقافة', 'كلية الطب والعلاج الطبيعي', 'كلية الصيدلة', 'شارع النصر', 'الزهور', 'عمر بن عبد العزيز']
  },
  {
    id: 3,
    name_ar: 'الـ 5000',
    details_ar: 'خط يربط المعدية بالتربية النوعية وحي العرب والمناخ',
    stops: ['المعدية / السكن الجامعي', 'كلية التربية النوعية', 'حي العرب', 'حي المناخ', 'التعاونيات', 'منطقة الـ 5000']
  },
  {
    id: 4,
    name_ar: 'التلاتيني',
    details_ar: 'يربط منطقة الـ 5000 بشارع الجمهورية',
    stops: ['منطقة الـ 5000', 'شارع الجمهورية']
  },
  {
    id: 5,
    name_ar: 'السلام',
    details_ar: 'حي العرب وشارع أسوان وفاطمة الزهراء',
    stops: ['حي العرب', 'شارع أسوان', 'فاطمة الزهراء', 'نفيسة']
  },
  {
    id: 6,
    name_ar: 'أسوان',
    details_ar: 'خط الرجوع من الطب والعلاج الطبيعي إلى قصر الثقافة وشارع أسوان',
    stops: ['كلية الطب والعلاج الطبيعي', 'قصر الثقافة', 'شارع أسوان']
  }
];

export const SEED_EXPLORE: ExploreItem[] = [
  {
    id: 'e1',
    kind: 'image',
    title_ar: 'فنار بورسعيد القديم',
    description_ar: 'التحفة المعمارية التي تأسست عام 1869 وأول فنار خرسانة مسلحة بالعالم.',
    file_name: '/assets/port-said/port-said-lighthouse.webp'
  },
  {
    id: 'e2',
    kind: 'image',
    title_ar: 'ميناء بورسعيد ليلًا',
    description_ar: 'سحر أضواء القناة وسفن العالم العابرة ليلاً.',
    file_name: '/assets/port-said/port-said-port-night.webp'
  },
  {
    id: 'e3',
    kind: 'image',
    title_ar: 'مسجد السلام التاريخي',
    description_ar: 'أحد أهم وأعرق معالم المدينة الباسلة بطراز إسلامي فريد.',
    file_name: '/assets/port-said/port-said-mosque.webp'
  },
  {
    id: 'e4',
    kind: 'image',
    title_ar: 'شرفات الحي الإفرنجي الخشبية',
    description_ar: 'العمارة التاريخية الفريدة الطراز والتحف المعمارية الخشبية في قلب بورسعيد.',
    file_name: '/assets/port-said/gallery/balconies-street.webp'
  },
  {
    id: 'e5',
    kind: 'image',
    title_ar: 'ميدان الشهداء ومسلة النصر',
    description_ar: 'رمز الصمود والفداء والبطولة للمدينة الباسلة.',
    file_name: '/assets/port-said/gallery/martyrs-square.webp'
  }
];

export const SEED_GOVERNORATES = [
  'بورسعيد', 'القاهرة', 'الإسكندرية', 'الإسماعيلية', 'السويس', 'دمياط', 'الشرقية', 'الدقهلية',
  'الجيزة', 'القليوبية', 'الغربية', 'المنوفية', 'كفر الشيخ', 'البحيرة', 'الفيوم', 'بني سويف',
  'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد', 'مطروح',
  'شمال سيناء', 'جنوب سيناء'
];

export const SEED_INSTITUTIONS = [
  'كلية التجارة — جامعة بورسعيد',
  'كلية الآداب — جامعة بورسعيد',
  'كلية التربية — جامعة بورسعيد',
  'كلية العلوم — جامعة بورسعيد',
  'كلية الهندسة — جامعة بورسعيد',
  'كلية التربية الرياضية — جامعة بورسعيد',
  'كلية التربية النوعية — جامعة بورسعيد',
  'كلية الحقوق — جامعة بورسعيد',
  'كلية الطب البشري — جامعة بورسعيد',
  'كلية التمريض — جامعة بورسعيد',
  'كلية الصيدلة — جامعة بورسعيد',
  'كلية العلاج الطبيعي — جامعة بورسعيد',
  'كلية تكنولوجيا الإدارة ونظم المعلومات — جامعة بورسعيد',
  'كلية علوم الحاسب وتقنية المعلومات — جامعة شرق بورسعيد الأهلية',
  'كلية الطب البشري — جامعة شرق بورسعيد الأهلية',
  'كلية الهندسة — جامعة شرق بورسعيد الأهلية',
  'كلية الصيدلة — جامعة شرق بورسعيد الأهلية',
  'كلية العلوم الصحية التطبيقية — جامعة شرق بورسعيد الأهلية',
  'كلية علوم الأعمال — جامعة شرق بورسعيد الأهلية',
  'كلية طب الأسنان — جامعة شرق بورسعيد الأهلية',
  'كلية الآداب — جامعة شرق بورسعيد الأهلية',
  'مدرسة (مش في كلية)',
  'كلية أخرى'
];
