'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Place } from '@/types';
import { INITIAL_PLACES, CATS } from '@/lib/constants';
import {
  PORT_SAID_CENTER,
  PORT_SAID_MAX_BOUNDS,
  isPointInPortSaid,
  calculateDistanceKm,
} from '@/lib/geoUtils';
import boundaryGeoJSON from '@/lib/data/portSaidBoundary.json';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Search,
  MapPin,
  Compass,
  Navigation,
  ExternalLink,
  X,
  Star,
  Utensils,
  Coffee,
  IceCream,
  Bed,
  ShoppingBag,
  AlertTriangle,
  Info,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';

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
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [searchWarning, setSearchWarning] = useState<string | null>(null);

  // 1. فرز الأماكن ذات الإحداثيات الصحيحة والمعتمدة فقط داخل بورسعيد
  const { validPlaces, missingCoordsPlaces } = useMemo(() => {
    const valid: Place[] = [];
    const missing: Place[] = [];

    places.forEach((p) => {
      if (
        typeof p.lat === 'number' &&
        typeof p.lon === 'number' &&
        !isNaN(p.lat) &&
        !isNaN(p.lon) &&
        isPointInPortSaid(p.lat, p.lon)
      ) {
        valid.push(p);
      } else {
        missing.push(p);
      }
    });

    return { validPlaces: valid, missingCoordsPlaces: missing };
  }, [places]);

  // 2. تصفية الأماكن المعروضة حسب التصنيف ونص البحث
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

  // 3. تهيئة MapLibre GL JS بنمط OpenFreeMap Positron المفتوح مجانًا
  useEffect(() => {
    let map: any;
    let isCancelled = false;

    async function initMapLibre() {
      if (!mapContainerRef.current) return;

      try {
        // استيراد ديناميكي للمكتبة لتجنب مشاكل Server-Side Rendering
        const maplibregl = await import('maplibre-gl');

        if (isCancelled || !mapContainerRef.current) return;

        map = new maplibregl.Map({
          container: mapContainerRef.current,
          // نمط OpenFreeMap Positron الرسمي
          style: 'https://tiles.openfreemap.org/styles/positron',
          // مركز مدينة بورسعيد وقناة السويس [Longitude, Latitude]
          center: PORT_SAID_CENTER,
          zoom: 13.5,
          minZoom: 10.5,
          maxZoom: 18.5,
          // قيد الحركة الصارم: محصور داخل حدود محافظة بورسعيد وبورفؤاد الإدارية
          maxBounds: PORT_SAID_MAX_BOUNDS,
          attributionControl: false, // سنضيف الإسناد المخصص المتوافق مع الشروط
        });

        // إضافة أزرار التحكم في التكبير والتدوير
        map.addControl(
          new maplibregl.NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }),
          'top-left'
        );

        map.on('load', () => {
          if (isCancelled) return;
          mapInstanceRef.current = map;
          setMapLoaded(true);

          // إضافة طبقة حدود بورسعيد الإدارية المعتمدة بخط أنيق
          try {
            map.addSource('port-said-boundary', {
              type: 'geojson',
              data: boundaryGeoJSON as any,
            });

            map.addLayer({
              id: 'port-said-boundary-line',
              type: 'line',
              source: 'port-said-boundary',
              paint: {
                'line-color': '#0f4c81',
                'line-width': 2,
                'line-dasharray': [3, 2],
                'line-opacity': 0.65,
              },
            });

            map.addLayer({
              id: 'port-said-boundary-fill',
              type: 'fill',
              source: 'port-said-boundary',
              paint: {
                'fill-color': '#0f4c81',
                'fill-opacity': 0.02,
              },
            });
          } catch (e) {
            console.warn('Could not add boundary layer:', e);
          }
        });
      } catch (err) {
        console.error('Failed to load MapLibre GL:', err);
      }
    }

    initMapLibre();

    return () => {
      isCancelled = true;
      if (map) {
        map.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 4. رسم علامات الأماكن المفلترة (Markers) باستخدام MapLibre
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    // مسح العلامات السابقة
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    async function addMarkers() {
      const maplibregl = await import('maplibre-gl');

      filteredPlaces.forEach((place) => {
        const el = document.createElement('div');
        el.className = 'hub-maplibre-marker cursor-pointer transition-transform duration-200';

        // لون وحرف الأيقونة حسب التصنيف
        const markerColor =
          place.cat === 'food'
            ? '#e63946'
            : place.cat === 'cafe'
            ? '#d97706'
            : place.cat === 'fun'
            ? '#059669'
            : place.cat === 'housing'
            ? '#7c3aed'
            : place.cat === 'sweets'
            ? '#db2777'
            : '#0284c7';

        const symbol =
          place.cat === 'food'
            ? '🍽️'
            : place.cat === 'cafe'
            ? '☕'
            : place.cat === 'fun'
            ? '⭐'
            : place.cat === 'housing'
            ? '🏠'
            : place.cat === 'sweets'
            ? '🍨'
            : '📍';

        el.innerHTML = `
          <div style="
            background: ${markerColor};
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 3px solid #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            transform-origin: center;
          ">
            ${symbol}
          </div>
        `;

        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.2) translateY(-4px)';
        });
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1) translateY(0)';
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([place.lon, place.lat])
          .addTo(map);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedPlace(place);
          map.flyTo({
            center: [place.lon, place.lat],
            zoom: 15.5,
            essential: true,
            duration: 800,
          });
        });

        markersRef.current.push(marker);
      });
    }

    addMarkers();
  }, [filteredPlaces, mapLoaded]);

  // 5. فحص نصوص البحث للتأكد من حصر الاستعلامات داخل نطاق بورسعيد
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setSearchWarning(null);

    const lower = val.toLowerCase();
    const outsideKeywords = ['قاهرة', 'القاهرة', 'إسكندرية', 'الاسكندرية', 'منصورة', 'سويس', 'اسماعيلية', 'طنطا', 'دقهلية'];
    const hasOutside = outsideKeywords.some((w) => lower.includes(w));

    if (hasOutside) {
      setSearchWarning('تنبيه: البحث والخريطة محصوران حصرياً في حدود محافظة بورسعيد وبورفؤاد.');
    }
  };

  // 6. تحديد الموقع الحالي للمستخدم بموافقته فقط
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setLocationNotice('خدمة تحديد الموقع الجغرافي غير مدعومة في متصفحك.');
      return;
    }

    setLocatingUser(true);
    setLocationNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocatingUser(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });

        // التحقق الصارم من وقوع إحداثيات المستخدم داخل حدود بورسعيد المعتمدة
        const inside = isPointInPortSaid(lat, lng);

        const map = mapInstanceRef.current;
        if (map) {
          const maplibregl = await import('maplibre-gl');

          // إضافة أو تحديث علامة موقع المستخدم
          if (!userMarkerRef.current) {
            const userEl = document.createElement('div');
            userEl.innerHTML = `
              <div style="
                width: 22px;
                height: 22px;
                border-radius: 50%;
                background: #0284c7;
                border: 3px solid #ffffff;
                box-shadow: 0 0 0 4px rgba(2, 132, 199, 0.4);
              "></div>
            `;
            userMarkerRef.current = new maplibregl.Marker({ element: userEl })
              .setLngLat([lng, lat])
              .addTo(map);
          } else {
            userMarkerRef.current.setLngLat([lng, lat]);
          }

          if (inside) {
            map.flyTo({
              center: [lng, lat],
              zoom: 15,
              essential: true,
            });
            setLocationNotice('تم تحديد موقعك الحالي داخل بورسعيد بنجاح 📍');
          } else {
            setLocationNotice(
              `موقعك الحالي (${lat.toFixed(2)}, ${lng.toFixed(2)}) يقع خارج حدود محافظة بورسعيد.`
            );
          }
        }
      },
      (err) => {
        setLocatingUser(false);
        if (err.code === 1) {
          setLocationNotice('يرجى السماح بصلاحية الموقع في المتصفح لتحديد مكانك بدقة.');
        } else {
          setLocationNotice('تعذر تحديد موقعك الحالي، يرجى التأكد من تفعيل خدمة الـ GPS.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // فتح الاتجاهات
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
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40">
                OpenFreeMap
              </span>
            </div>
            <p className="text-xs text-ocean-700/80 dark:text-white/70 font-medium mt-0.5">
              خريطة متجهة مفتوحة المصدر مجانية ومحصورة في الحدود الإدارية المعتمدة لبورسعيد
            </p>
          </div>
        </div>

        {/* Action Controls */}
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

      {/* Alert Notices */}
      <AnimatePresence>
        {locationNotice && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-2xl bg-teal2-500/10 border border-teal2-500/30 text-teal2-800 dark:text-teal2-300 text-xs flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-1.5 font-bold">
              <Info className="w-4 h-4 shrink-0" />
              <span>{locationNotice}</span>
            </span>
            <button onClick={() => setLocationNotice(null)} type="button">
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

      {/* Search & Category Filter Pills */}
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

        {/* Counter of Places */}
        <div className="flex items-center justify-between text-[11px] text-ocean-700/70 dark:text-white/60 font-semibold px-1">
          <span>
            يتم عرض <strong>{filteredPlaces.length}</strong> مكان مؤكد بإحداثيات GPS في نطاق بورسعيد
          </span>

          {missingCoordsPlaces.length > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              ({missingCoordsPlaces.length} أماكن بدون إحداثيات لم يتم تخمينها)
            </span>
          )}
        </div>
      </div>

      {/* Main Map Container using MapLibre GL */}
      <div className="relative rounded-3xl overflow-hidden border border-sand-300 dark:border-[#1d2d3e] shadow-2xl bg-sand-100 dark:bg-[#071322] h-[55vh] min-h-[440px] sm:h-[650px] w-full">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Selected Place Popup Card */}
        <AnimatePresence>
          {selectedPlace && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="absolute bottom-10 inset-x-3 sm:inset-x-auto sm:right-4 sm:w-96 z-[1000] p-4 rounded-3xl bg-white/95 dark:bg-[#0c1622]/95 backdrop-blur-md border border-sand-300 dark:border-[#22354a] shadow-2xl text-ocean-900 dark:text-white space-y-3"
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
                  title="فتح المسار والاتجاهات"
                >
                  <span>الاتجاهات</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Required OpenFreeMap & OpenStreetMap Attribution Footer */}
        <div className="absolute bottom-1 right-2 z-10 px-2 py-0.5 rounded bg-white/85 dark:bg-black/75 backdrop-blur-sm text-[10px] text-ocean-900 dark:text-white/80 border border-black/10 select-none">
          ©{' '}
          <a
            href="https://openfreemap.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline font-bold text-teal2-700 dark:text-teal2-400"
          >
            OpenFreeMap
          </a>{' '}
          • Data ©{' '}
          <a
            href="https://openmaptiles.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            OpenMapTiles
          </a>{' '}
          • ©{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            OpenStreetMap contributors
          </a>
        </div>
      </div>

      {/* Handling Places Missing Coordinates Gracefully Without Guessing */}
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
