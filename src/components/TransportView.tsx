'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bus,
  MapPin,
  Navigation,
  ArrowRight,
  ArrowLeftRight,
  Compass,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Info,
  CheckCircle2,
  RotateCw,
  Locate,
  Crosshair,
  Search,
  X,
  ChevronDown,
  Layers,
  Map as MapIcon,
  ShieldCheck,
  Ship,
  Train,
  Car,
} from 'lucide-react';
import { Place } from '@/types';
import {
  ALL_STOPS,
  HOME_STOP,
  TRANSPORT_NET,
  TRANSPORT_NOTE,
  planRoute,
  INITIAL_PLACES,
} from '@/lib/constants';
import {
  PORT_SAID_CENTER,
  PORT_SAID_MAX_BOUNDS,
  isPointInPortSaid,
  calculateDistanceKm,
  identifyPortSaidDistrict,
} from '@/lib/geoUtils';
import boundaryGeoJSON from '@/lib/data/portSaidBoundary.json';
import 'maplibre-gl/dist/maplibre-gl.css';

// الإحداثيات الجغرافية الموثقة لمحطات ومواقف شبكة السرفيس في بورسعيد
export const STOP_COORDINATES: Record<string, { lat: number; lon: number; district: string }> = {
  'المعدية / السكن الجامعي': { lat: 31.2447, lon: 32.3202, district: 'بورفؤاد' },
  'قصر الثقافة': { lat: 31.2575, lon: 32.2930, district: 'حي المناخ' },
  'معهد الحاسب الآلي': { lat: 31.2402, lon: 32.2851, district: 'حي الضواحي' },
  'كلية التكنولوجيا والحقوق': { lat: 31.2384, lon: 32.2825, district: 'حي الضواحي' },
  'بنك الإسكان': { lat: 31.2395, lon: 32.2840, district: 'حي الضواحي' },
  'السلام': { lat: 31.2562, lon: 32.2890, district: 'حي المناخ' },
  'قسم الضواحي': { lat: 31.2380, lon: 32.2820, district: 'حي الضواحي' },
  'الحريتين': { lat: 31.2520, lon: 32.2880, district: 'حي المناخ' },
  'شارع التلاتيني': { lat: 31.2582, lon: 32.2905, district: 'حي العرب' },
  'المنشية': { lat: 31.2607, lon: 32.2980, district: 'حي العرب' },
  'كلية الطب والعلاج الطبيعي': { lat: 31.2465, lon: 32.2745, district: 'حي الزهور' },
  'كلية الصيدلة': { lat: 31.2460, lon: 32.2740, district: 'حي الزهور' },
  'شارع النصر': { lat: 31.2590, lon: 32.2915, district: 'حي المناخ' },
  'الزهور': { lat: 31.2460, lon: 32.2740, district: 'حي الزهور' },
  'عمر بن عبد العزيز': { lat: 31.2420, lon: 32.2720, district: 'حي الزهور' },
  'كلية التربية النوعية': { lat: 31.2640, lon: 32.3025, district: 'حي الشرق' },
  'الإفرنج': { lat: 31.2640, lon: 32.3025, district: 'حي الشرق' },
  'حي العرب': { lat: 31.2580, lon: 32.2960, district: 'حي العرب' },
  'حي المناخ': { lat: 31.2550, lon: 32.2850, district: 'حي المناخ' },
  'التعاونيات': { lat: 31.2480, lon: 32.2810, district: 'حي الزهور' },
  'منطقة الـ 5000': { lat: 31.2430, lon: 32.2790, district: 'حي الزهور' },
  'شارع الجمهورية': { lat: 31.2630, lon: 32.3050, district: 'حي الشرق' },
  'شارع أسوان': { lat: 31.2540, lon: 32.2870, district: 'حي العرب' },
  'فاطمة الزهراء': { lat: 31.2360, lon: 32.2780, district: 'حي الضواحي' },
  'نفيسة': { lat: 31.2330, lon: 32.2750, district: 'حي الضواحي' },
};

// المراكز والمحطات الرئيسية لوسائل المواصلات المعتمدة في بورسعيد
export const PORT_SAID_TRANSIT_HUBS = [
  {
    id: 'hub-ferry',
    name: 'معدية بورسعيد – بورفؤاد (مرسى المعديات)',
    category: 'معدية مائية عبر قناة السويس',
    iconType: 'ferry',
    area: 'بورفؤاد / حي الشرق',
    desc: 'الرابط الملاحي المباشر بين قارتي إفريقيا وآسيا ومدينتي بورسعيد وبورفؤاد عبر المجرى الملاحي لقناة السويس. رحلة بحرية ممتعة ومجانية للمشاة والأفراد.',
    lat: 31.244709,
    lon: 32.320168,
    schedule: 'تعمل على مدار 24 ساعة يوميًا (رحلة كل 10 إلى 15 دقيقة)',
    cost: 'مجاني تماماً للمشاة والأفراد',
    badge: 'شريان العبور المائي',
    maps_url: 'https://www.google.com/maps/search/?api=1&query=%D9%85%D8%B9%D8%AF%D9%8A%D8%A9%20%D8%A8%D9%88%D8%B1%D8%B3%D8%B9%D9%8A%D8%AF%20%E2%80%93%20%D8%A8%D9%88%D8%B1%D9%81%D8%A4%D8%A7%D8%AF',
  },
  {
    id: 'hub-landport',
    name: 'ميناء بورسعيد البري الجديد (مجمع المواقف)',
    category: 'مجمع حافلات السفر والميكروباص',
    iconType: 'bus',
    area: 'حي الضواحي',
    desc: 'المجمع الحضاري الرئيسي لجميع حافلات النقل بين المحافظات (سوبرجيت، جو باص، شرق الدلتا) وسيارات الميكروباص إلى القاهرة، الإسكندرية، الإسماعيلية، دمياط، والمنصورة.',
    lat: 31.2345,
    lon: 32.2760,
    schedule: 'رحلات مستمرة للمحافظات على مدار 24 ساعة',
    cost: 'وفق التعريفة الرسمية المعتمدة لكل خط سفر',
    badge: 'بوابة المحافظات بالمدخل الجنوبي',
    maps_url: 'https://www.google.com/maps/search/?api=1&query=%D9%85%D9%8A%D9%86%D8%A7%D8%A1%20%D8%A8%D9%88%D8%B1%D8%B3%D8%B9%D9%8A%D8%AF%20%D8%A7%D9%84%D8%A8%D8%B1%D9%8A%20%D8%A7%D9%84%D8%AC%D8%AF%D9%8A%D8%AF',
  },
  {
    id: 'hub-railway',
    name: 'محطة قطار بورسعيد (السكة الحديد)',
    category: 'قطارات سكك حديد مصر',
    iconType: 'train',
    area: 'حي الشرق',
    desc: 'المحطة التاريخية لقطارات السكة الحديد في شارع الشهيد عاطف السادات، تنطلق منها قطارات الركاب والدرجات المكيفة والروسية إلى الإسماعيلية، الزقازيق، القاهرة، والإسكندرية.',
    lat: 31.2589,
    lon: 32.2995,
    schedule: 'مواعيد منتظمة ومجدولة وفق هيئة سكك حديد مصر',
    cost: 'وفق أسعار تذاكر سكك حديد مصر الرسمية',
    badge: 'محطة السكة الحديد بقلب المدينة',
    maps_url: 'https://www.google.com/maps/search/?api=1&query=%D9%85%D8%AD%D8%B7%D8%A9%20%D9%82%D8%B7%D8%A7%D8%B1%20%D8%A8%D9%88%D8%B1%D8%B3%D8%B9%D9%8A%D8%AF',
  },
  {
    id: 'hub-taxi',
    name: 'تاكسي بورسعيد الأبيض والأزرق',
    category: 'سيارات أجرة مخصوصة داخل المدينة',
    iconType: 'car',
    area: 'جميع أحياء بورسعيد وبورفؤاد',
    desc: 'سيارات التاكسي باللونين الأبيض والأزرق المميزين لمحافظة بورسعيد. وسيلة الانتقال السريع من الباب إلى الباب مع سهولة العثور عليها في كافة الشوارع والميادين الرئيسية.',
    lat: 31.2612,
    lon: 32.3019,
    schedule: 'متوفر على مدار 24 ساعة في كافة الشوارع والميادين',
    cost: 'وفق التعريفة الداخلية المحددة من محافظة بورسعيد',
    badge: 'وسيلة التنقل السريع بالمدينة',
    maps_url: 'https://www.google.com/maps/search/?api=1&query=%D8%A8%D9%88%D8%B1%D8%B3%D8%B9%D9%8A%D8%AF',
  },
];

const MAP_STYLES = [
  { key: 'positron', label: 'ناصع (Positron)', url: 'https://tiles.openfreemap.org/styles/positron', icon: '☀️' },
  { key: 'bright', label: 'حيوي (Bright)', url: 'https://tiles.openfreemap.org/styles/bright', icon: '🏙️' },
  { key: 'liberty', label: 'معالم (Liberty)', url: 'https://tiles.openfreemap.org/styles/liberty', icon: '🗺️' },
];

export interface PointLocation {
  name: string;
  lat: number;
  lon: number;
  district?: string;
  isCustom?: boolean;
}

interface TransportViewProps {
  onBack: () => void;
  onNavigate?: (view: string, arg?: string | null) => void;
  places?: Place[];
}

export const TransportView: React.FC<TransportViewProps> = ({
  onBack,
  onNavigate,
  places = INITIAL_PLACES,
}) => {
  // حالة البداية والوجهة
  const [fromName, setFromName] = useState<string>(HOME_STOP);
  const [toName, setToName] = useState<string>('كلية الطب والعلاج الطبيعي');
  const [startPoint, setStartPoint] = useState<PointLocation | null>(() => {
    const coords = STOP_COORDINATES[HOME_STOP];
    return coords
      ? { name: HOME_STOP, lat: coords.lat, lon: coords.lon, district: coords.district }
      : { name: HOME_STOP, lat: 31.2447, lon: 32.3202, district: 'بورفؤاد' };
  });
  const [endPoint, setEndPoint] = useState<PointLocation | null>(() => {
    const coords = STOP_COORDINATES['كلية الطب والعلاج الطبيعي'];
    return coords
      ? { name: 'كلية الطب والعلاج الطبيعي', lat: coords.lat, lon: coords.lon, district: coords.district }
      : { name: 'كلية الطب والعلاج الطبيعي', lat: 31.2465, lon: 32.2745, district: 'حي الزهور' };
  });

  // حالة تحديد الموقع الحالي عبر GPS
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; district?: string } | null>(null);

  // حالة اختيار نقطة من الخريطة
  const [pickingTarget, setPickingTarget] = useState<'from' | 'to' | null>(null);

  // حالة مسار الشارع الفعلي عبر OSRM
  const [isRoutingLoading, setIsRoutingLoading] = useState<boolean>(false);
  const [streetRouteResult, setStreetRouteResult] = useState<{
    geometry: any;
    distanceMeters: number;
    durationSeconds: number;
    isReal: boolean;
  } | null>(null);
  const [routingError, setRoutingError] = useState<string | null>(null);

  // حالة الخريطة التفاعلية
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [selectedMapStyle, setSelectedMapStyle] = useState<string>('positron');
  const [swapAnimation, setSwapAnimation] = useState<number>(0);

  // قائمة الاقتراحات السريعة للكليات والوجهات الشائعة
  const QUICK_SHORTCUTS = [
    { label: 'الطب والعلاج الطبيعي', target: 'كلية الطب والعلاج الطبيعي' },
    { label: 'التكنولوجيا والحقوق', target: 'كلية التكنولوجيا والحقوق' },
    { label: 'التربية النوعية', target: 'كلية التربية النوعية' },
    { label: 'الصيدلة', target: 'كلية الصيدلة' },
    { label: 'معدية بورفؤاد', target: 'معدية بورسعيد – بورفؤاد (مرسى المعديات)' },
    { label: 'الميناء البري (المواقف)', target: 'ميناء بورسعيد البري الجديد (مجمع المواقف)' },
    { label: 'محطة قطار بورسعيد', target: 'محطة قطار بورسعيد (السكة الحديد)' },
  ];

  // دمج كل النقاط المتاحة للبحث (محطات السرفيس + الأماكن المعتمدة في بورسعيد)
  const searchableOptions = useMemo(() => {
    const list: Array<{ label: string; lat: number; lon: number; district: string; type: string }> = [];

    // محطات شبكة المواصلات
    ALL_STOPS.forEach((stop) => {
      const c = STOP_COORDINATES[stop];
      if (c) {
        list.push({
          label: stop,
          lat: c.lat,
          lon: c.lon,
          district: c.district,
          type: 'محطة سرفيس',
        });
      }
    });

    // مراكز النقل الحيوية
    PORT_SAID_TRANSIT_HUBS.forEach((hub) => {
      list.push({
        label: hub.name,
        lat: hub.lat,
        lon: hub.lon,
        district: hub.area,
        type: hub.category,
      });
    });

    // أهم أماكن بورسعيد المعتمدة
    places.slice(0, 50).forEach((p) => {
      if (typeof p.lat === 'number' && typeof p.lon === 'number' && !list.some((item) => item.label === p.n)) {
        list.push({
          label: p.n,
          lat: p.lat,
          lon: p.lon,
          district: p.a,
          type: 'مكان معتمد',
        });
      }
    });

    return list;
  }, [places]);

  // خطة خطوط السرفيس والميكروباص بين النقطتين (إن كانت ضمن شبكة السرفيس)
  const routePlan = useMemo(() => {
    // مطابقة اسم النقطة مع أقرب محطة في ALL_STOPS
    const fromClean = ALL_STOPS.find((s) => s === fromName) || fromName;
    const toClean = ALL_STOPS.find((s) => s === toName) || toName;
    return planRoute(fromClean, toClean);
  }, [fromName, toName]);

  // 1. طلب وتحديد الموقع الحالي للمستخدم عبر Geolocation API
  const handleGetCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError('خاصية تحديد الموقع الجغرافي غير مدعومة في متصفحك.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;

        // التحقق من وقوع الموقع داخل النطاق الإداري لبورسعيد
        const inPortSaid = isPointInPortSaid(latitude, longitude);
        const district = identifyPortSaidDistrict(latitude, longitude);

        const userPoint: PointLocation = {
          name: inPortSaid ? `موقعي الحالي (${district})` : 'موقعي الحالي',
          lat: Number(latitude.toFixed(6)),
          lon: Number(longitude.toFixed(6)),
          district: district,
          isCustom: true,
        };

        setUserLocation({ lat: latitude, lng: longitude, district });
        setStartPoint(userPoint);
        setFromName(userPoint.name);

        // تحريك الخريطة إلى موقع المستخدم
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            duration: 800,
          });
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('تم رفض إذن الوصول للموقع الجغرافي. يمكنك اختيار نقطة الانطلاق يدوياً أو النقر على الخريطة.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationError('إشارة الموقع غير متاحة حالياً. يرجى اختيار النقطة يدوياً.');
        } else {
          setLocationError('تعذر تحديد موقعك الحالي. يرجى اختيار نقطة البداية من القائمة.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // 2. عكس نقطة الانطلاق مع الوجهة
  const handleSwap = () => {
    setSwapAnimation((prev) => prev + 180);
    const tempName = fromName;
    const tempPoint = startPoint;
    setFromName(toName);
    setStartPoint(endPoint);
    setToName(tempName);
    setEndPoint(tempPoint);
  };

  // 3. اختيار نقطة بداية محددة
  const handleSelectFrom = (name: string) => {
    setFromName(name);
    const found = searchableOptions.find((o) => o.label === name);
    if (found) {
      setStartPoint({ name: found.label, lat: found.lat, lon: found.lon, district: found.district });
    }
  };

  // 4. اختيار نقطة وصول محددة
  const handleSelectTo = (name: string) => {
    setToName(name);
    const found = searchableOptions.find((o) => o.label === name);
    if (found) {
      setEndPoint({ name: found.label, lat: found.lat, lon: found.lon, district: found.district });
    }
  };

  // 5. جلب مسار الشارع الفعلي من OSRM بين نقطتي البداية والنهاية
  const handleFetchRoute = async () => {
    if (!startPoint || !endPoint) {
      setRoutingError('يرجى تحديد نقطتي الانطلاق والوجهة أولاً.');
      return;
    }

    if (startPoint.lat === endPoint.lat && startPoint.lon === endPoint.lon) {
      setRoutingError('نقطة البداية مطابقة لنقطة النهاية! اختر وجهة مختلفة.');
      return;
    }

    setIsRoutingLoading(true);
    setRoutingError(null);

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startPoint.lon},${startPoint.lat};${endPoint.lon},${endPoint.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url, { cache: 'no-store' });

      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          setStreetRouteResult({
            geometry: route.geometry,
            distanceMeters: Math.round(route.distance),
            durationSeconds: Math.round(route.duration),
            isReal: true,
          });
          setIsRoutingLoading(false);
          return;
        }
      }

      // إذا لم يتوفر مسار حقيقي مؤكد من الخدمة
      setStreetRouteResult({
        geometry: null,
        distanceMeters: 0,
        durationSeconds: 0,
        isReal: false,
      });
      setRoutingError('خدمة مسارات الشوارع الحية غير متاحة لهذا المسار حالياً. تم تحديد نقطتي البداية والنهاية على الخريطة لتسهيل التوجه.');
    } catch (err) {
      console.warn('Routing fetch failed:', err);
      setStreetRouteResult({
        geometry: null,
        distanceMeters: 0,
        durationSeconds: 0,
        isReal: false,
      });
      setRoutingError('تعذر الاتصال بخدمة توجيه الطرق الحية. يمكنك استعراض النقطتين مباشرة على الخريطة أو الملاحة عبر خرائط جوجل.');
    } finally {
      setIsRoutingLoading(false);
    }
  };

  // طلب المسار تلقائياً عند تغيير البداية والنهاية
  useEffect(() => {
    if (startPoint && endPoint && (startPoint.lat !== endPoint.lat || startPoint.lon !== endPoint.lon)) {
      handleFetchRoute();
    }
  }, [startPoint?.lat, startPoint?.lon, endPoint?.lat, endPoint?.lon]);

  // 6. تهيئة خريطة MapLibre
  useEffect(() => {
    let map: any = null;

    async function initMap() {
      if (!mapContainerRef.current) return;
      const maplibregl = await import('maplibre-gl');

      const initialCenter: [number, number] = startPoint
        ? [startPoint.lon, startPoint.lat]
        : PORT_SAID_CENTER;

      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLES.find((s) => s.key === selectedMapStyle)?.url || MAP_STYLES[0].url,
        center: initialCenter,
        zoom: 13,
        maxBounds: PORT_SAID_MAX_BOUNDS,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-left');

      map.on('load', () => {
        // إضافة حدود بورسعيد الإدارية
        try {
          if (!map.getSource('port-said-boundary')) {
            map.addSource('port-said-boundary', {
              type: 'geojson',
              data: boundaryGeoJSON as any,
            });

            map.addLayer({
              id: 'ps-boundary-line',
              type: 'line',
              source: 'port-said-boundary',
              paint: {
                'line-color': '#0284c7',
                'line-width': 2,
                'line-dasharray': [4, 2],
                'line-opacity': 0.45,
              },
            });
          }
        } catch (e) {
          console.warn('Boundary setup notice:', e);
        }

        setMapLoaded(true);
      });

      // التقاط النقرات على الخريطة لاختيار نقطة البداية أو النهاية
      map.on('click', (e: any) => {
        if (!pickingTarget) return;

        const { lng, lat } = e.lngLat;
        const inside = isPointInPortSaid(lat, lng);
        const district = identifyPortSaidDistrict(lat, lng);

        const pickedPoint: PointLocation = {
          name: `${pickingTarget === 'from' ? 'نقطة الانطلاق' : 'الوجهة'} (${district})`,
          lat: Number(lat.toFixed(6)),
          lon: Number(lng.toFixed(6)),
          district: district,
          isCustom: true,
        };

        if (pickingTarget === 'from') {
          setStartPoint(pickedPoint);
          setFromName(pickedPoint.name);
        } else {
          setEndPoint(pickedPoint);
          setToName(pickedPoint.name);
        }

        setPickingTarget(null);
      });

      mapInstanceRef.current = map;
    }

    initMap();

    return () => {
      if (map) {
        map.remove();
        mapInstanceRef.current = null;
        setMapLoaded(false);
      }
    };
  }, [selectedMapStyle]);

  // مؤشر الفأرة عند تفعيل وضع اختيار النقطة من الخريطة
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;
    map.getCanvas().style.cursor = pickingTarget ? 'crosshair' : '';
  }, [pickingTarget, mapLoaded]);

  // 7. رسم العلامات (البداية، الوجهة، موقع المستخدم، محطات النقل الحيوية)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    async function renderPins() {
      const maplibregl = await import('maplibre-gl');

      // 1. دبوس موقع المستخدم الفعلي (إذا توفر)
      if (userLocation) {
        const userEl = document.createElement('div');
        userEl.className = 'cursor-pointer flex flex-col items-center select-none';
        userEl.innerHTML = `
          <div style="
            width: 22px;
            height: 22px;
            background: #2563eb;
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 0 6px rgba(37,99,235,0.3), 0 3px 10px rgba(0,0,0,0.3);
          "></div>
          <div style="
            margin-top: 4px;
            background: #1e3a8a;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            padding: 2px 7px;
            border-radius: 9999px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            white-space: nowrap;
          ">
            موقعك
          </div>
        `;
        const userMarker = new maplibregl.Marker({ element: userEl })
          .setLngLat([userLocation.lng, userLocation.lat])
          .addTo(map);
        markersRef.current.push(userMarker);
      }

      // 2. دبوس نقطة البداية (أخضر)
      if (startPoint) {
        const startEl = document.createElement('div');
        startEl.className = 'cursor-pointer flex flex-col items-center select-none';
        startEl.innerHTML = `
          <div style="
            background: #10b981;
            color: #ffffff;
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2.5px solid #ffffff;
            box-shadow: 0 4px 12px rgba(16,185,129,0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
          ">
            <span style="transform: rotate(45deg);">🏁</span>
          </div>
          <div style="
            margin-top: 4px;
            background: #064e3b;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            padding: 2px 8px;
            border-radius: 9999px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            white-space: nowrap;
          ">
            البداية
          </div>
        `;
        const startMarker = new maplibregl.Marker({ element: startEl })
          .setLngLat([startPoint.lon, startPoint.lat])
          .addTo(map);
        markersRef.current.push(startMarker);
      }

      // 3. دبوس نقطة النهاية (أحمر)
      if (endPoint && (!startPoint || startPoint.lat !== endPoint.lat || startPoint.lon !== endPoint.lon)) {
        const endEl = document.createElement('div');
        endEl.className = 'cursor-pointer flex flex-col items-center select-none';
        endEl.innerHTML = `
          <div style="
            background: #ef4444;
            color: #ffffff;
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2.5px solid #ffffff;
            box-shadow: 0 4px 12px rgba(239,68,68,0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
          ">
            <span style="transform: rotate(45deg);">🎯</span>
          </div>
          <div style="
            margin-top: 4px;
            background: #7f1d1d;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            padding: 2px 8px;
            border-radius: 9999px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            white-space: nowrap;
          ">
            الوجهة
          </div>
        `;
        const endMarker = new maplibregl.Marker({ element: endEl })
          .setLngLat([endPoint.lon, endPoint.lat])
          .addTo(map);
        markersRef.current.push(endMarker);
      }

      // 4. دبابيس محطات النقل والمعديات الحيوية
      PORT_SAID_TRANSIT_HUBS.forEach((hub) => {
        const hubEl = document.createElement('div');
        hubEl.className = 'cursor-pointer flex flex-col items-center select-none group';
        hubEl.innerHTML = `
          <div style="
            background: #1e3a8a;
            color: #ffffff;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 8px rgba(30,58,138,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
          ">
            ${hub.iconType === 'ferry' ? '🚢' : hub.iconType === 'train' ? '🚆' : '🚌'}
          </div>
        `;

        hubEl.addEventListener('click', (ev) => {
          ev.stopPropagation();
          setEndPoint({
            name: hub.name,
            lat: hub.lat,
            lon: hub.lon,
            district: hub.area,
          });
          setToName(hub.name);
          map.flyTo({ center: [hub.lon, hub.lat], zoom: 15, duration: 600 });
        });

        const hubMarker = new maplibregl.Marker({ element: hubEl })
          .setLngLat([hub.lon, hub.lat])
          .addTo(map);
        markersRef.current.push(hubMarker);
      });
    }

    renderPins();
  }, [startPoint, endPoint, userLocation, mapLoaded]);

  // 8. رسم خط مسار الشوارع الفعلي فقط عندما يتوفر من OSRM (تطبيق شرط عدم رسم خط مستقيم)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    const sourceId = 'transit-route-source';
    const casingLayerId = 'transit-route-casing';
    const lineLayerId = 'transit-route-line';

    // مسح الطبقات السابقة إذا لم يتوفر مسار شارع حقيقي
    const cleanupLayers = () => {
      try {
        if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
        if (map.getLayer(casingLayerId)) map.removeLayer(casingLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch (e) {}
    };

    if (streetRouteResult && streetRouteResult.isReal && streetRouteResult.geometry) {
      cleanupLayers();

      try {
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: streetRouteResult.geometry,
          },
        });

        // خط تباين داكن
        map.addLayer({
          id: casingLayerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#0f2942',
            'line-width': 7,
            'line-opacity': 0.5,
          },
        });

        // خط المسار الرئيسي باللون الأزرق
        map.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#0284c7',
            'line-width': 4.5,
          },
        });

        // ضبط الكاميرا لاحتضان المسار
        const coords = streetRouteResult.geometry.coordinates;
        if (Array.isArray(coords) && coords.length > 0) {
          import('maplibre-gl').then((maplibregl) => {
            const bounds = new maplibregl.LngLatBounds();
            coords.forEach((c: [number, number]) => bounds.extend(c));
            map.fitBounds(bounds, {
              padding: { top: 60, bottom: 60, left: 60, right: 60 },
              maxZoom: 16,
              duration: 800,
            });
          });
        }
      } catch (err) {
        console.warn('Failed to draw street route:', err);
      }
    } else {
      cleanupLayers();

      // إذا لم يتوفر مسار شوارع، نحتضن النقطتين معاً دون رسم خط مستقيم
      if (startPoint && endPoint && (startPoint.lat !== endPoint.lat || startPoint.lon !== endPoint.lon)) {
        import('maplibre-gl').then((maplibregl) => {
          const bounds = new maplibregl.LngLatBounds();
          bounds.extend([startPoint.lon, startPoint.lat]);
          bounds.extend([endPoint.lon, endPoint.lat]);
          map.fitBounds(bounds, {
            padding: { top: 80, bottom: 80, left: 80, right: 80 },
            maxZoom: 15,
            duration: 800,
          });
        });
      }
    }
  }, [streetRouteResult, startPoint, endPoint, mapLoaded]);

  // رابط توجيه Google Maps المباشر
  const googleMapsDirectionsUrl = useMemo(() => {
    if (!startPoint || !endPoint) return null;
    return `https://www.google.com/maps/dir/?api=1&origin=${startPoint.lat},${startPoint.lon}&destination=${endPoint.lat},${endPoint.lon}&travelmode=driving`;
  }, [startPoint, endPoint]);

  return (
    <motion.div
      className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-20"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
    >
      {/* 1. زر الرجوع والهيدر الرئيسي */}
      <div className="flex items-center justify-between">
        <motion.button
          onClick={onBack}
          type="button"
          className="inline-flex items-center gap-2 font-bold text-ocean-700 dark:text-teal2-400 hover:text-blue-600 transition group"
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          <span>الرئيسية</span>
        </motion.button>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>بيانات وخطوط معتمدة</span>
        </span>
      </div>

      {/* 2. عنوان الصفحة والوصف والإحصائيات */}
      <div className="bg-gradient-to-br from-white via-sand-50/50 to-blue-50/30 dark:from-[#0d1825] dark:via-[#09131f] dark:to-[#0c1f36] p-6 sm:p-8 rounded-3xl border border-sand-200/80 dark:border-[#1d2d3e] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-ocean-900 dark:text-white flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-blue-600 text-white grid place-items-center shadow-md shrink-0">
                <Bus className="w-6 h-6" />
              </span>
              <span>اتحرّك في بورسعيد بسهولة</span>
            </h1>
            <p className="text-sm sm:text-base text-ocean-700/80 dark:text-ocean-100/70 font-semibold leading-relaxed max-w-2xl">
              اكتشف خطوط السرفيس، مواقف السفر، والمعديات المائية. حدد نقطة تحركك ووجهتك واعرف أفضل طريقة للوصول داخل بورسعيد وبورفؤاد.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-3 rounded-2xl bg-white dark:bg-[#132233] border border-sand-200 dark:border-[#22354a] text-center shadow-xs">
              <span className="block text-xl font-black text-blue-600 dark:text-blue-400">6</span>
              <span className="text-[11px] font-bold text-ocean-700/70 dark:text-white/60">خطوط سرفيس</span>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white dark:bg-[#132233] border border-sand-200 dark:border-[#22354a] text-center shadow-xs">
              <span className="block text-xl font-black text-emerald-600 dark:text-emerald-400">4</span>
              <span className="text-[11px] font-bold text-ocean-700/70 dark:text-white/60">محطات رئيسية</span>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white dark:bg-[#132233] border border-sand-200 dark:border-[#22354a] text-center shadow-xs">
              <span className="block text-xl font-black text-amber-600 dark:text-amber-400">24h</span>
              <span className="text-[11px] font-bold text-ocean-700/70 dark:text-white/60">المعديات البحرية</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. صندوق البحث عن رحلة وتحديد البداية والوجهة */}
      <div className="bg-white dark:bg-[#0f1a28] p-5 sm:p-7 rounded-3xl border border-sand-200/80 dark:border-[#1d2d3e] shadow-md space-y-5">
        <div className="flex items-center justify-between border-b border-sand-200/60 dark:border-[#1d2d3e] pb-3.5">
          <h2 className="text-base sm:text-lg font-black text-ocean-900 dark:text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-600" />
            <span>البحث عن رحلة ومسار الانتقال</span>
          </h2>

          <motion.button
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold transition disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLocating ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Locate className="w-3.5 h-3.5 text-blue-600" />
            )}
            <span>{isLocating ? 'جارٍ تحديد موقعك...' : 'استخدم موقعي الحالي'}</span>
          </motion.button>
        </div>

        {/* تنبيه رفض إذن الموقع أو تعذر تحديده */}
        <AnimatePresence>
          {locationError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span>{locationError}</span>
              </div>
              <button
                onClick={() => setLocationError(null)}
                className="text-amber-700 hover:text-amber-900 dark:hover:text-amber-100"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* حقول الإدخال: من وإلى مع زر التبديل واختيار من الخريطة */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
          {/* نقطة الانطلاق */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-ocean-800 dark:text-white/80 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>من (نقطة الانطلاق):</span>
              </span>
              <button
                type="button"
                onClick={() => setPickingTarget(pickingTarget === 'from' ? null : 'from')}
                className={`text-[11px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-lg transition ${
                  pickingTarget === 'from'
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                }`}
              >
                <Crosshair className="w-3 h-3" />
                <span>{pickingTarget === 'from' ? 'انقر على الخريطة الآن' : 'اختر من الخريطة'}</span>
              </button>
            </label>

            <div className="relative">
              <select
                value={fromName}
                onChange={(e) => handleSelectFrom(e.target.value)}
                className="w-full rounded-2xl border border-sand-300 dark:border-[#22354a] bg-sand-50/70 dark:bg-[#142232] px-3.5 py-3 text-xs sm:text-sm font-bold text-ocean-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition appearance-none"
              >
                {searchableOptions.map((opt, i) => (
                  <option key={`${opt.label}-${i}`} value={opt.label}>
                    {opt.label} ({opt.district})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-ocean-700/50 dark:text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* زر عكس الاتجاه */}
          <div className="flex justify-center pt-2 md:pt-4">
            <motion.button
              onClick={handleSwap}
              type="button"
              aria-label="اعكس الاتجاه"
              className="w-11 h-11 rounded-2xl bg-sand-100 dark:bg-[#1a2d42] text-ocean-800 dark:text-white grid place-items-center hover:bg-sand-200 dark:hover:bg-[#233b56] transition shadow-xs border border-sand-200 dark:border-[#24374c]"
              animate={{ rotate: swapAnimation }}
              transition={{ type: 'spring', stiffness: 280, damping: 20 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
            >
              <ArrowLeftRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </motion.button>
          </div>

          {/* الوجهة */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-ocean-800 dark:text-white/80 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>إلى (الوجهة المقصودة):</span>
              </span>
              <button
                type="button"
                onClick={() => setPickingTarget(pickingTarget === 'to' ? null : 'to')}
                className={`text-[11px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-lg transition ${
                  pickingTarget === 'to'
                    ? 'bg-rose-600 text-white'
                    : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                }`}
              >
                <Crosshair className="w-3 h-3" />
                <span>{pickingTarget === 'to' ? 'انقر على الخريطة الآن' : 'اختر من الخريطة'}</span>
              </button>
            </label>

            <div className="relative">
              <select
                value={toName}
                onChange={(e) => handleSelectTo(e.target.value)}
                className="w-full rounded-2xl border border-sand-300 dark:border-[#22354a] bg-sand-50/70 dark:bg-[#142232] px-3.5 py-3 text-xs sm:text-sm font-bold text-ocean-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition appearance-none"
              >
                {searchableOptions.map((opt, i) => (
                  <option key={`${opt.label}-to-${i}`} value={opt.label}>
                    {opt.label} ({opt.district})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-ocean-700/50 dark:text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* اختصارات الكليات والمحطات الرئيسية */}
        <div className="pt-3 border-t border-sand-200/60 dark:border-[#1d2d3e] space-y-2">
          <p className="text-xs font-black text-ocean-800 dark:text-white/70 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>وجهات شائعة وسريعة:</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_SHORTCUTS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleSelectTo(item.target)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  toName === item.target
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-sand-50 dark:bg-[#152332] text-ocean-800 dark:text-white/80 border-sand-200 dark:border-[#24374c] hover:border-blue-400'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* زر البحث وعرض المسار */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <motion.button
            onClick={handleFetchRoute}
            disabled={isRoutingLoading}
            type="button"
            className="w-full sm:w-auto flex-1 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {isRoutingLoading ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            <span>{isRoutingLoading ? 'جارٍ فحص المسار الفعلي...' : 'عرض المسار وطريقة الوصول'}</span>
          </motion.button>

          {googleMapsDirectionsUrl && (
            <a
              href={googleMapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-sand-100 hover:bg-sand-200 dark:bg-[#1a2d42] dark:hover:bg-[#233b56] text-ocean-900 dark:text-white font-bold text-xs transition flex items-center justify-center gap-2 border border-sand-300 dark:border-[#24374c]"
            >
              <span>فتح الاتجاهات في Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
            </a>
          )}
        </div>
      </div>

      {/* 4. قسم الخريطة التفاعلية مع المسار ونقاط التوجيه */}
      <div className="bg-white dark:bg-[#0f1a28] rounded-3xl border border-sand-200/80 dark:border-[#1d2d3e] shadow-md overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-sand-200/60 dark:border-[#1d2d3e] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 grid place-items-center">
              <MapIcon className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-black text-ocean-900 dark:text-white">خريطة التحرك والمسار المعتمد</h3>
              <p className="text-[11px] text-ocean-700/70 dark:text-white/60 font-medium">
                {pickingTarget
                  ? `انقر على أي موقع على الخريطة لتحديده كـ ${pickingTarget === 'from' ? 'نقطة انطلاق' : 'وجهة'}`
                  : 'استعرض محطات النقل والمعديات ومسار الشوارع الفعلي'}
              </p>
            </div>
          </div>

          {/* محدد نمط الخريطة */}
          <div className="flex items-center gap-1.5 bg-sand-50 dark:bg-[#142232] p-1 rounded-xl border border-sand-200 dark:border-[#22354a]">
            {MAP_STYLES.map((st) => (
              <button
                key={st.key}
                onClick={() => setSelectedMapStyle(st.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  selectedMapStyle === st.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-ocean-700 dark:text-white/70 hover:bg-sand-200 dark:hover:bg-[#1c3046]'
                }`}
              >
                <span>{st.icon}</span>
                <span className="hidden sm:inline">{st.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* حاوية MapLibre */}
        <div className="relative w-full h-[360px] sm:h-[440px] bg-sand-100 dark:bg-[#071322]">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* شريط الإشعار عند تفعيل النقر على الخريطة */}
          {pickingTarget && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-2xl bg-ocean-900/90 text-white text-xs font-black shadow-lg backdrop-blur-md flex items-center gap-2 border border-white/20">
              <Crosshair className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>
                انقر على الخريطة لتحديد {pickingTarget === 'from' ? 'نقطة الانطلاق 🏁' : 'الوجهة 🎯'}
              </span>
              <button
                onClick={() => setPickingTarget(null)}
                className="mr-2 text-white/70 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* وسيلة إيضاح الخريطة */}
          <div className="absolute bottom-3 right-3 z-10 p-2.5 rounded-2xl bg-white/90 dark:bg-[#0f1a28]/90 backdrop-blur-md border border-sand-200 dark:border-[#1d2d3e] text-[10px] font-bold text-ocean-900 dark:text-white shadow-sm flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>نقطة البداية</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>الوجهة</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span>محطات النقل والمعديات</span>
            </span>
          </div>
        </div>

        {/* نتائج المسار الفعلي أو التنبيه الواضح عند عدم توفر خدمة الطرق */}
        <div className="p-4 sm:p-5 bg-sand-50/70 dark:bg-[#0c1622] border-t border-sand-200/60 dark:border-[#1d2d3e]">
          {streetRouteResult && streetRouteResult.isReal ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 grid place-items-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40">
                      مسار شوارع فعلي موثّق
                    </span>
                  </div>
                  <p className="text-xs text-ocean-700/80 dark:text-white/70 font-semibold mt-1">
                    المسافة الفعلية بالسيارة:{' '}
                    <strong className="text-ocean-900 dark:text-white font-black">
                      {(streetRouteResult.distanceMeters / 1000).toFixed(1)} كم
                    </strong>
                    {' — '}
                    المدة التقديرية للقيادة:{' '}
                    <strong className="text-ocean-900 dark:text-white font-black">
                      {Math.max(1, Math.round(streetRouteResult.durationSeconds / 60))} دقيقة
                    </strong>
                  </p>
                </div>
              </div>

              {googleMapsDirectionsUrl && (
                <a
                  href={googleMapsDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition self-start sm:self-auto shrink-0"
                >
                  <span>بدء الملاحة الحية</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ) : routingError ? (
            <div className="flex items-start gap-3 text-xs text-ocean-800 dark:text-white/80 font-semibold leading-relaxed">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-bold text-ocean-900 dark:text-white">{routingError}</p>
                <p className="text-ocean-700/70 dark:text-white/60">
                  وفق معايير الدقة، لا نعرض خطوطاً مستقيمة وهمية كبديل للطريق الحقيقي. يمكنك استخدام زر الملاحة أدناه لفتح المسار التفصيلي فوراً.
                </p>
              </div>
              {googleMapsDirectionsUrl && (
                <a
                  href={googleMapsDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs transition shrink-0"
                >
                  فتح المسار في خرائط جوجل
                </a>
              )}
            </div>
          ) : (
            <p className="text-xs text-ocean-700/70 dark:text-white/60 font-semibold text-center py-1">
              اختر نقطتي التحرك والوجهة لمعاينة المسار ومحطات النقل المشتركة 🗺️
            </p>
          )}
        </div>
      </div>

      {/* 5. تفاصيل خطة خطوط السرفيس والميكروباص المعتمدة */}
      <div className="bg-white dark:bg-[#0f1a28] p-5 sm:p-7 rounded-3xl border border-sand-200/80 dark:border-[#1d2d3e] shadow-md space-y-5">
        <div className="flex items-center justify-between border-b border-sand-200/60 dark:border-[#1d2d3e] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 grid place-items-center">
              <Bus className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-black text-ocean-900 dark:text-white">خطة خطوط السرفيس والميكروباص</h3>
              <p className="text-xs text-ocean-700/70 dark:text-white/60 font-medium">
                مسارات السرفيس الحقيقية المعتمدة لطلبة ومواطني بورسعيد
              </p>
            </div>
          </div>
        </div>

        {fromName === toName ? (
          <div className="text-center py-8">
            <span className="text-3xl mb-2 block">📍</span>
            <p className="text-sm font-bold text-ocean-900 dark:text-white">أنت بالفعل في نفس النقطة!</p>
            <p className="text-xs text-ocean-700/70 dark:text-white/60 mt-1">اختر وجهة مختلفة لمعرفة خط السير المناسب.</p>
          </div>
        ) : !routePlan ? (
          <div className="text-center py-8 bg-sand-50 dark:bg-[#132233] rounded-2xl border border-sand-200 dark:border-[#22354a] p-5">
            <p className="text-sm font-black text-ocean-900 dark:text-white">
              لا يوجد خط سرفيس مباشر مسجل بين هاتين النقطتين في الشبكة الحالية.
            </p>
            <p className="text-xs text-ocean-700/80 dark:text-white/70 mt-1 max-w-md mx-auto leading-relaxed">
              يمكنك استخدام تاكسي بورسعيد الأبيض والأزرق للوصول المباشر، أو التوجه لأقرب محطة رئيسية مثل قصر الثقافة أو مجمع المواقف.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black text-xs px-3.5 py-1">
                <Navigation className="w-3.5 h-3.5" />
                <span>
                  {routePlan.length === 1
                    ? 'رحلة سرفيس مباشرة (بدون تبديل)'
                    : `تبديل خط سرفيس ${routePlan.length - 1} مرة`}
                </span>
              </span>

              <span className="text-xs font-bold text-ocean-700/60 dark:text-white/50">
                {routePlan.length} خطوات سير
              </span>
            </div>

            <ol className="space-y-4 relative">
              {routePlan.map((x, i) => {
                const noteKey = `${x.l}|${x.t}`;
                let note = TRANSPORT_NOTE[noteKey] || '';
                const nextStep = routePlan[i + 1];
                if (x.t === 'قصر الثقافة') {
                  note = nextStep && nextStep.f === x.t ? `انزل عند قصر الثقافة واركب ${nextStep.l} من الشارع الرئيسي` : '';
                }

                return (
                  <motion.li
                    key={i}
                    className="flex gap-3 text-sm"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 * i }}
                  >
                    <div className="flex flex-col items-center">
                      <span className="w-8 h-8 shrink-0 rounded-2xl bg-blue-600 text-white grid place-items-center font-black text-xs shadow-md">
                        {i + 1}
                      </span>
                      {i < routePlan.length - 1 && (
                        <span className="flex-1 w-0.5 bg-blue-200 dark:bg-blue-800 my-1 rounded-full" />
                      )}
                    </div>

                    <div className="pb-3 min-w-0 flex-1">
                      <p className="font-black text-ocean-900 dark:text-white text-sm sm:text-base">
                        اركب خط{' '}
                        <span className="rounded-xl bg-blue-700 text-white px-2.5 py-0.5 text-xs font-black">
                          {x.l}
                        </span>
                      </p>
                      <p className="text-xs text-ocean-700/80 dark:text-white/70 mt-1 font-semibold">
                        نقطة الركوب: <span className="font-bold text-ocean-900 dark:text-white">{x.f}</span>
                      </p>
                      <p className="text-xs font-black text-ocean-900 dark:text-white mt-0.5">
                        وانزل عند:{' '}
                        <span className="text-blue-600 dark:text-blue-400 font-extrabold">{x.t}</span>
                      </p>
                      {note && (
                        <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <Info className="w-4 h-4 shrink-0 text-amber-500" />
                          <span>{note}</span>
                        </div>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </div>
        )}
      </div>

      {/* 6. دليل محطات ومراكز النقل الحيوية في بورسعيد (بيانات مؤكدة فقط) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-ocean-900 dark:text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-600" />
            <span>مراكز ومحطات النقل المعتمدة في بورسعيد</span>
          </h2>
          <span className="text-xs font-bold text-ocean-700/60 dark:text-white/50">4 محطات رئيسية</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PORT_SAID_TRANSIT_HUBS.map((hub) => (
            <motion.div
              key={hub.id}
              className="bg-white dark:bg-[#0f1a28] p-5 rounded-3xl border border-sand-200/80 dark:border-[#1d2d3e] shadow-sm flex flex-col justify-between space-y-4"
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 grid place-items-center text-lg shrink-0">
                      {hub.iconType === 'ferry' ? <Ship className="w-5 h-5" /> : hub.iconType === 'train' ? <Train className="w-5 h-5" /> : hub.iconType === 'car' ? <Car className="w-5 h-5" /> : <Bus className="w-5 h-5" />}
                    </span>
                    <div>
                      <h4 className="font-black text-sm text-ocean-900 dark:text-white">{hub.name}</h4>
                      <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400">{hub.category}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-sand-100 dark:bg-[#1a2d42] text-[10px] font-black text-ocean-800 dark:text-white/80 shrink-0">
                    {hub.area}
                  </span>
                </div>

                <p className="text-xs text-ocean-700/80 dark:text-white/70 leading-relaxed font-medium">
                  {hub.desc}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-sand-200/60 dark:border-[#1d2d3e] text-[11px]">
                  <div className="flex items-center justify-between text-ocean-700/80 dark:text-white/70">
                    <span className="font-bold">المواعيد:</span>
                    <span className="font-semibold text-ocean-900 dark:text-white">{hub.schedule}</span>
                  </div>
                  <div className="flex items-center justify-between text-ocean-700/80 dark:text-white/70">
                    <span className="font-bold">التكلفة:</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">{hub.cost}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEndPoint({
                      name: hub.name,
                      lat: hub.lat,
                      lon: hub.lon,
                      district: hub.area,
                    });
                    setToName(hub.name);
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo({
                        center: [hub.lon, hub.lat],
                        zoom: 15,
                        duration: 700,
                      });
                    }
                  }}
                  className="flex-1 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs transition text-center"
                >
                  تحديد كوجهة على الخريطة
                </button>

                <a
                  href={hub.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-sand-100 hover:bg-sand-200 dark:bg-[#1a2d42] dark:hover:bg-[#233b56] text-ocean-700 dark:text-white/80 transition"
                  aria-label="الموقع على Google Maps"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
