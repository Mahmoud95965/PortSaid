'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Place } from '@/types';
import { INITIAL_PLACES, CATS } from '@/lib/constants';
import {
  Search,
  MapPin,
  Compass,
  Navigation,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  Layers,
  Sparkles,
  Star,
  Utensils,
  Coffee,
  IceCream,
  Bed,
  ShoppingBag,
  Bus,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

// النطاق الجغرافي الدقيق لمحافظة بورسعيد وبورفؤاد (Port Said Geographic Bounds)
export const PORT_SAID_BOUNDS = {
  north: 31.33, // شواطئ البحر المتوسط والممر الملاحي شمالاً
  south: 31.18, // الجمارك الجنوبية، الرسوة، والمنطقة الصناعية جنوباً
  east: 32.42, // بورفؤاد، جبال الملح، وميناء شرق بورسعيد شرقاً
  west: 32.18, // بحيرة المنزلة، الجميل، والمدخل الغربي غرباً
};

export const PORT_SAID_CENTER = {
  lat: 31.2653,
  lng: 32.3019,
};

// التحقق البرمجي الصارم من وقوع الإحداثيات داخل نطاق بورسعيد
export function isCoordinateInPortSaid(lat: number, lng: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return false;
  }
  return (
    lat >= PORT_SAID_BOUNDS.south &&
    lat <= PORT_SAID_BOUNDS.north &&
    lng >= PORT_SAID_BOUNDS.west &&
    lng <= PORT_SAID_BOUNDS.east
  );
}

// حساب المسافة بين نقطتين بالكيلومتر (Haversine Formula)
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // نصف قطر الأرض بالكيلومتر
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

interface MapViewProps {
  places?: Place[];
  onSelectPlace?: (id: string) => void;
  onBack?: () => void;
}

const CATEGORY_FILTERS = [
  { key: 'all', label: 'الكل', icon: Compass },
  { key: 'food', label: 'مطاعم', icon: Utensils },
  { key: 'cafe', label: 'كافيهات', icon: Coffee },
  { key: 'fun', label: 'معالم وسياحة', icon: Star },
  { key: 'housing', label: 'سكن الطلبة', icon: Bed },
  { key: 'sweets', label: 'حلويات', icon: IceCream },
  { key: 'shop', label: 'تسوق وأسواق', icon: ShoppingBag },
];

export const MapView: React.FC<MapViewProps> = ({
  places = INITIAL_PLACES,
  onSelectPlace,
  onBack,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchWarning, setSearchWarning] = useState<string | null>(null);
  const [mapEngine, setMapEngine] = useState<'google' | 'leaflet' | 'loading'>('loading');
  const [showConfigNotice, setShowConfigNotice] = useState<boolean>(true);

  // تخزين المراجع للخرائط
  const googleMapInstanceRef = useRef<any>(null);
  const googleMarkersRef = useRef<any[]>([]);
  const leafletMapInstanceRef = useRef<any>(null);
  const leafletMarkersRef = useRef<any[]>([]);

  // فصل الأماكن ذات الإحداثيات الصحيحة عن الأماكن الناقصة
  const { validPlaces, missingCoordsPlaces } = useMemo(() => {
    const valid: Place[] = [];
    const missing: Place[] = [];

    places.forEach((p) => {
      if (
        typeof p.lat === 'number' &&
        typeof p.lon === 'number' &&
        !isNaN(p.lat) &&
        !isNaN(p.lon) &&
        isCoordinateInPortSaid(p.lat, p.lon)
      ) {
        valid.push(p);
      } else {
        missing.push(p);
      }
    });

    return { validPlaces: valid, missingCoordsPlaces: missing };
  }, [places]);

  // الأماكن المفلترة حسب التصنيف والبحث
  const filteredPlaces = useMemo(() => {
    return validPlaces.filter((p) => {
      const matchCategory =
        selectedCategory === 'all' ||
        p.cat === selectedCategory ||
        (selectedCategory === 'fun' && (p.cat === 'fun' || p.cat === 'explore'));

      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.n.toLowerCase().includes(q) ||
        p.a.toLowerCase().includes(q) ||
        (p.ds && p.ds.toLowerCase().includes(q));

      return matchCategory && matchSearch;
    });
  }, [validPlaces, selectedCategory, searchQuery]);

  // 1. تحميل محرك الخرائط (Google Maps أولاً إذا وُجد المفتاح، أو Leaflet كبديل فوري متكامل)
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (apiKey && apiKey.trim().length > 10) {
      // تحميل Google Maps JavaScript API رسمياً
      loadGoogleMaps(apiKey);
    } else {
      // تشغيل خريطة Leaflet / OpenStreetMap المتجاوبة تلقائياً بدون أخطاء
      loadLeafletMap();
    }

    return () => {
      if (leafletMapInstanceRef.current) {
        try {
          leafletMapInstanceRef.current.remove();
        } catch (e) {}
      }
    };
  }, []);

  // دالة تحميل Google Maps API
  const loadGoogleMaps = (apiKey: string) => {
    if ((window as any).google && (window as any).google.maps) {
      initGoogleMap();
      return;
    }

    const scriptId = 'google-maps-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&language=ar&region=EG`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initGoogleMap();
      };
      script.onerror = () => {
        console.warn('Google Maps API failed to load, falling back to Leaflet engine.');
        loadLeafletMap();
      };
      document.head.appendChild(script);
    } else {
      initGoogleMap();
    }
  };

  // تهيئة خريطة Google Maps
  const initGoogleMap = () => {
    if (!mapContainerRef.current || !(window as any).google?.maps) return;

    try {
      const google = (window as any).google;

      const mapOptions = {
        center: PORT_SAID_CENTER,
        zoom: 13.5,
        minZoom: 11,
        maxZoom: 19,
        restriction: {
          latLngBounds: {
            north: PORT_SAID_BOUNDS.north,
            south: PORT_SAID_BOUNDS.south,
            east: PORT_SAID_BOUNDS.east,
            west: PORT_SAID_BOUNDS.west,
          },
          strictBounds: true,
        },
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: google.maps.ControlPosition.TOP_RIGHT,
        },
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.LEFT_BOTTOM,
        },
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
          { featureType: 'water', stylers: [{ color: '#134074' }] },
        ],
      };

      const map = new google.maps.Map(mapContainerRef.current, mapOptions);
      googleMapInstanceRef.current = map;
      setMapEngine('google');

      renderGoogleMarkers(filteredPlaces);
    } catch (err) {
      console.error('Error initializing Google Maps:', err);
      loadLeafletMap();
    }
  };

  // رسم علامات الأماكن في Google Maps
  const renderGoogleMarkers = (placesToRender: Place[]) => {
    const map = googleMapInstanceRef.current;
    const google = (window as any).google;
    if (!map || !google) return;

    // مسح العلامات السابقة
    googleMarkersRef.current.forEach((m) => m.setMap(null));
    googleMarkersRef.current = [];

    placesToRender.forEach((place) => {
      const markerColor =
        place.cat === 'food'
          ? '#e63946'
          : place.cat === 'cafe'
          ? '#d97706'
          : place.cat === 'fun'
          ? '#059669'
          : place.cat === 'housing'
          ? '#7c3aed'
          : '#0284c7';

      const marker = new google.maps.Marker({
        position: { lat: place.lat, lng: place.lon },
        map: map,
        title: place.n,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: markerColor,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2.5,
        },
      });

      marker.addListener('click', () => {
        setSelectedPlace(place);
        map.panTo({ lat: place.lat, lng: place.lon });
        if (map.getZoom() < 15) map.setZoom(15);
      });

      googleMarkersRef.current.push(marker);
    });
  };

  // دالة تشغيل Leaflet كبديل فوري متكامل مع OpenStreetMap
  const loadLeafletMap = () => {
    if (!mapContainerRef.current) return;

    const leafletCssId = 'leaflet-css';
    if (!document.getElementById(leafletCssId)) {
      const link = document.createElement('link');
      link.id = leafletCssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const leafletScriptId = 'leaflet-js';
    if (!document.getElementById(leafletScriptId)) {
      const script = document.createElement('script');
      script.id = leafletScriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => {
        initLeafletMap();
      };
      document.head.appendChild(script);
    } else {
      setTimeout(() => initLeafletMap(), 150);
    }
  };

  // تهيئة خريطة Leaflet
  const initLeafletMap = () => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    try {
      if (leafletMapInstanceRef.current) {
        leafletMapInstanceRef.current.remove();
      }

      const map = L.map(mapContainerRef.current, {
        center: [PORT_SAID_CENTER.lat, PORT_SAID_CENTER.lng],
        zoom: 13.5,
        minZoom: 11,
        maxZoom: 18,
        maxBounds: [
          [PORT_SAID_BOUNDS.south, PORT_SAID_BOUNDS.west],
          [PORT_SAID_BOUNDS.north, PORT_SAID_BOUNDS.east],
        ],
        maxBoundsViscosity: 1.0, // منع السحب خارج بورسعيد كلياً
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap & Port Said Hub',
        maxZoom: 18,
      }).addTo(map);

      leafletMapInstanceRef.current = map;
      setMapEngine('leaflet');

      renderLeafletMarkers(filteredPlaces);
    } catch (e) {
      console.error('Error creating Leaflet map:', e);
    }
  };

  // رسم علامات الأماكن في Leaflet
  const renderLeafletMarkers = (placesToRender: Place[]) => {
    const L = (window as any).L;
    const map = leafletMapInstanceRef.current;
    if (!L || !map) return;

    // مسح العلامات السابقة
    leafletMarkersRef.current.forEach((m) => m.remove());
    leafletMarkersRef.current = [];

    placesToRender.forEach((place) => {
      const markerColor =
        place.cat === 'food'
          ? '#e63946'
          : place.cat === 'cafe'
          ? '#d97706'
          : place.cat === 'fun'
          ? '#059669'
          : place.cat === 'housing'
          ? '#7c3aed'
          : '#0284c7';

      const customIcon = L.divIcon({
        className: 'custom-hub-marker',
        html: `
          <div style="
            background: ${markerColor};
            width: 26px;
            height: 26px;
            border-radius: 50%;
            border: 3px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 11px;
            font-weight: bold;
            cursor: pointer;
          ">
            ★
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([place.lat, place.lon], { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        setSelectedPlace(place);
        map.panTo([place.lat, place.lon]);
        if (map.getZoom() < 15) map.setZoom(15);
      });

      leafletMarkersRef.current.push(marker);
    });
  };

  // تحديث العلامات عند تغيير التصنيف أو البحث
  useEffect(() => {
    if (mapEngine === 'google') {
      renderGoogleMarkers(filteredPlaces);
    } else if (mapEngine === 'leaflet') {
      renderLeafletMarkers(filteredPlaces);
    }
  }, [filteredPlaces, mapEngine]);

  // التحقق عند إدخال بحث نصي للتأكد من حصر النتائج داخل بورسعيد
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setSearchWarning(null);

    // إذا كتب المستخدم اسم مدينة خارج بورسعيد (مثل القاهرة أو الإسكندرية) ننبهه فوراً
    const lower = val.toLowerCase();
    const bannedCities = ['قاهرة', 'القاهرة', 'إسكندرية', 'الاسكندرية', 'منصورة', 'سويس', 'اسماعيلية', 'طنطا'];
    const matchedBanned = bannedCities.find((c) => lower.includes(c));

    if (matchedBanned) {
      setSearchWarning(`تنبيه: البحث والخريطة مقتصران حصرياً على نطاق محافظة بورسعيد وبورفؤاد.`);
    }
  };

  // تحديد الموقع الحالي للمستخدم عند الطلب فقط
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setLocationError('خدمة تحديد الموقع الجغرافي غير مدعومة في متصفحك.');
      return;
    }

    setLocatingUser(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setUserLocation({ lat: userLat, lng: userLng });

        // التحقق الصارم من وقوع موقع المستخدم داخل بورسعيد
        const inBounds = isCoordinateInPortSaid(userLat, userLng);

        if (inBounds) {
          // تحريك الخريطة لموقع المستخدم
          if (mapEngine === 'google' && googleMapInstanceRef.current) {
            googleMapInstanceRef.current.panTo({ lat: userLat, lng: userLng });
            googleMapInstanceRef.current.setZoom(15);
          } else if (mapEngine === 'leaflet' && leafletMapInstanceRef.current) {
            leafletMapInstanceRef.current.panTo([userLat, userLng]);
            leafletMapInstanceRef.current.setZoom(15);
          }
        } else {
          setLocationError(
            `أنت حالياً خارج نطاق محافظة بورسعيد (${userLat.toFixed(2)}, ${userLng.toFixed(2)}). الخريطة تقتصر على معالم بورسعيد.`
          );
        }
      },
      (err) => {
        setLocatingUser(false);
        if (err.code === 1) {
          setLocationError('يرجى السماح بصلاحية الموقع في المتصفح لتحديد مكانك بدقة.');
        } else {
          setLocationError('تعذر تحديد موقعك الحالي، يرجى التأكد من تشغيل الـ GPS.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // فتح الاتجاهات في Google Maps في نافذة مستقلة
  const handleOpenDirections = (place: Place) => {
    let url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;
    if (userLocation) {
      url += `&origin=${userLocation.lat},${userLocation.lng}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4 relative w-full">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-[#0c1622] p-4 sm:p-5 rounded-3xl border border-sand-200/90 dark:border-[#1d2d3e] shadow-lg">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              type="button"
              className="w-10 h-10 rounded-2xl bg-sand-100 dark:bg-[#152332] hover:bg-sand-200 text-ocean-900 dark:text-white grid place-items-center transition shrink-0"
              title="العودة"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}

          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal2-500 to-ocean-800 text-white grid place-items-center shrink-0 shadow-md">
            <Compass className="w-6 h-6 text-sand-300" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-ocean-900 dark:text-white leading-tight">
                خريطة بورسعيد التفاعلية
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal2-100 dark:bg-teal2-950/70 text-teal2-800 dark:text-teal2-300 border border-teal2-300/40">
                Google Maps
              </span>
            </div>
            <p className="text-xs text-ocean-700/80 dark:text-white/70 font-medium mt-0.5">
              استكشف أماكن ومطاعم ومعالم بورسعيد وبورفؤاد مع حصر النطاق الجغرافي والاتجاهات
            </p>
          </div>
        </div>

        {/* Quick Location & Status Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleLocateUser}
            disabled={locatingUser}
            type="button"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-ocean-900 via-ocean-800 to-teal2-700 text-white font-bold text-xs shadow-md hover:opacity-95 transition disabled:opacity-50"
          >
            <Navigation className={`w-4 h-4 text-sand-400 ${locatingUser ? 'animate-spin' : ''}`} />
            <span>{locatingUser ? 'جارٍ تحديد موقعك...' : 'موقعي الحالي'}</span>
          </button>
        </div>
      </div>

      {/* Notice regarding API key setup if Leaflet is active */}
      {showConfigNotice && mapEngine === 'leaflet' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-ocean-900 dark:text-sand-200 flex items-start justify-between gap-3 text-xs leading-relaxed"
        >
          <div className="flex items-start gap-2.5">
            <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-sm text-ocean-900 dark:text-white">
                الخريطة تعمل حاليًا في النطاق الجغرافي لبورسعيد (وضع المعاينة المباشر):
              </p>
              <p className="mt-1 text-ocean-700/80 dark:text-white/75 font-medium">
                جميع أماكن قاعدة البيانات ومحطات بورسعيد محددة بدقة على الخريطة. لتفعيل واجهة
                <strong> Google Maps Platform الرسمية</strong>، أضف مفتاح{' '}
                <code className="bg-white/40 dark:bg-black/30 px-1 py-0.5 rounded font-mono text-amber-700 dark:text-amber-300">
                  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                </code>{' '}
                في ملف <code className="font-mono">.env.local</code>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowConfigNotice(false)}
            type="button"
            className="text-ocean-700/60 dark:text-white/50 hover:text-ocean-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Location or Search Alert Banners */}
      <AnimatePresence>
        {locationError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{locationError}</span>
            </span>
            <button onClick={() => setLocationError(null)} type="button">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {searchWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{searchWarning}</span>
            </span>
            <button onClick={() => setSearchWarning(null)} type="button">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Bar: Search Input + Categories */}
      <div className="bg-white dark:bg-[#0c1622] p-3.5 sm:p-4 rounded-3xl border border-sand-200/90 dark:border-[#1d2d3e] shadow-md space-y-3">
        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-ocean-700/50 dark:text-white/40 absolute right-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث عن مطعم سمك، كافيه، معلم، أو سكن في بورسعيد..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pr-10 pl-9 py-2.5 rounded-2xl border border-sand-300 dark:border-[#22354a] bg-sand-50/80 dark:bg-[#132030] text-xs sm:text-sm text-ocean-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal2-500 font-medium shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchWarning(null);
              }}
              type="button"
              className="absolute left-3 w-5 h-5 rounded-full bg-sand-200 dark:bg-[#1f3044] text-ocean-700 dark:text-white/70 grid place-items-center text-xs"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORY_FILTERS.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                type="button"
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap flex items-center gap-1.5 transition ${
                  isSelected
                    ? 'bg-ocean-900 text-sand-300 dark:bg-white dark:text-ocean-950 shadow-md'
                    : 'bg-sand-100/80 dark:bg-[#152332] text-ocean-800 dark:text-white/70 hover:bg-sand-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Status Count Line */}
        <div className="flex items-center justify-between text-[11px] text-ocean-700/70 dark:text-white/60 font-semibold px-1">
          <span>
            يتم عرض <strong>{filteredPlaces.length}</strong> مكان داخل نطاق بورسعيد وبورفؤاد
          </span>

          {missingCoordsPlaces.length > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              ({missingCoordsPlaces.length} أماكن بدون إحداثيات لم يتم تخمينها)
            </span>
          )}
        </div>
      </div>

      {/* Main Map Container */}
      <div className="relative rounded-3xl overflow-hidden border border-sand-300 dark:border-[#1d2d3e] shadow-2xl bg-sand-100 dark:bg-[#071322] h-[55vh] min-h-[420px] sm:h-[650px] w-full">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Active Selected Place Popup Card */}
        <AnimatePresence>
          {selectedPlace && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="absolute bottom-3 inset-x-3 sm:inset-x-auto sm:right-4 sm:w-96 z-[1000] p-4 rounded-3xl bg-white/95 dark:bg-[#0c1622]/95 backdrop-blur-md border border-sand-300 dark:border-[#22354a] shadow-2xl text-ocean-900 dark:text-white space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal2-100 dark:bg-teal2-950/70 text-teal2-800 dark:text-teal2-300">
                      {CATS[selectedPlace.cat]?.t || selectedPlace.cat}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sand-100 dark:bg-[#152332] text-ocean-800 dark:text-white/70">
                      {selectedPlace.a}
                    </span>
                    {selectedPlace.disc > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-ocean-950">
                        خصم {selectedPlace.disc}%
                      </span>
                    )}
                  </div>

                  <h3 className="font-black text-base sm:text-lg text-ocean-900 dark:text-white mt-1 leading-snug">
                    {selectedPlace.n}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedPlace(null)}
                  type="button"
                  className="w-7 h-7 rounded-full bg-sand-100 dark:bg-[#1a2739] hover:bg-sand-200 text-ocean-700 dark:text-white/70 grid place-items-center transition shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedPlace.ds && (
                <p className="text-xs text-ocean-700/80 dark:text-white/75 font-medium line-clamp-2 leading-relaxed">
                  {selectedPlace.ds}
                </p>
              )}

              {/* Distance from user if location available */}
              {userLocation && (
                <div className="p-2 rounded-xl bg-teal2-50 dark:bg-teal2-950/40 border border-teal2-200 dark:border-teal2-900 text-[11px] font-bold text-teal2-800 dark:text-teal2-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal2-600" />
                  <span>
                    يبعد عن موقعك الحالي:{' '}
                    <strong>
                      {calculateDistanceKm(
                        userLocation.lat,
                        userLocation.lng,
                        selectedPlace.lat,
                        selectedPlace.lon
                      )}{' '}
                      كم
                    </strong>
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                {onSelectPlace && (
                  <button
                    onClick={() => onSelectPlace(selectedPlace.id)}
                    type="button"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-ocean-900 dark:bg-white text-sand-300 dark:text-ocean-950 font-black text-xs shadow hover:opacity-90 transition text-center"
                  >
                    عرض صفحة المكان
                  </button>
                )}

                <button
                  onClick={() => handleOpenDirections(selectedPlace)}
                  type="button"
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-ocean-950 font-black text-xs shadow transition flex items-center justify-center gap-1.5 shrink-0"
                  title="فتح المسار في خرائط Google"
                >
                  <span>الاتجاهات</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Handling of Places with Missing Coordinates (Gracefully without guessing) */}
      {missingCoordsPlaces.length > 0 && (
        <div className="p-4 rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-200/90 dark:border-[#1d2d3e] shadow-sm space-y-2.5">
          <h4 className="font-black text-xs sm:text-sm text-ocean-900 dark:text-white flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-500" />
            <span>أماكن مسجلة في المنصة تحتاج إلى تدقيق إحداثيات GPS:</span>
          </h4>
          <p className="text-xs text-ocean-700/70 dark:text-white/60">
            للحفاظ على دقة الخريطة ومنع التخمين، تم استبعاد الأماكن التالية مؤقتاً حتى يتم إدخال
            إحداثياتها الجغرافية الصحيحة:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {missingCoordsPlaces.map((p) => (
              <span
                key={p.id}
                onClick={() => onSelectPlace && onSelectPlace(p.id)}
                className="cursor-pointer px-3 py-1 rounded-xl bg-sand-100 dark:bg-[#152332] text-[11px] font-bold text-ocean-800 dark:text-white/80 hover:bg-sand-200 transition"
              >
                {p.n} ({p.a})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
