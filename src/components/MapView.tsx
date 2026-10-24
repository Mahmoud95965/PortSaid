'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Place } from '@/types';
import { INITIAL_PLACES, CATS } from '@/lib/constants';
import {
  PORT_SAID_CENTER,
  PORT_SAID_MAX_BOUNDS,
  PORT_SAID_DISTRICTS,
  isPointInPortSaid,
  calculateDistanceKm,
  identifyPortSaidDistrict,
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
  Palette,
  Maximize2,
} from 'lucide-react';

interface MapViewProps {
  places?: Place[];
  initialPlaceId?: string | null;
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

const MAP_STYLES = [
  { key: 'positron', label: 'ناصع (Positron)', url: 'https://tiles.openfreemap.org/styles/positron', icon: '☀️' },
  { key: 'bright', label: 'حيوي (Bright)', url: 'https://tiles.openfreemap.org/styles/bright', icon: '🏙️' },
  { key: 'liberty', label: 'معالم (Liberty)', url: 'https://tiles.openfreemap.org/styles/liberty', icon: '🗺️' },
];

const TOP_SIGHTS = [
  { name: 'مطعم كاستن', keyword: 'كاستن', icon: '🐟' },
  { name: 'فنار بورسعيد', keyword: 'فنار', icon: '⚓' },
  { name: 'سوق السمك', keyword: 'سوق السمك', icon: '🛒' },
  { name: 'ممشى ديليسبس', keyword: 'ديليسبس', icon: '🚢' },
  { name: 'حلويات سيلفر', keyword: 'سيلفر', icon: '🍨' },
  { name: 'بينوس كافيه', keyword: 'بينوس', icon: '☕' },
  { name: 'مسجد السلام', keyword: 'السلام', icon: '🕌' },
];

export const MapView: React.FC<MapViewProps> = ({
  places = INITIAL_PLACES,
  initialPlaceId,
  onSelectPlace,
  onBack,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [selectedMapStyle, setSelectedMapStyle] = useState<string>('positron');
  const [showStyleMenu, setShowStyleMenu] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; district?: string } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [searchWarning, setSearchWarning] = useState<string | null>(null);

  // 1. فرز الأماكن ذات الإحداثيات الصحيحة والمعتمدة فقط داخل حدود بورسعيد
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

  // دالة مساعدة لإضافة طبقة حدود بورسعيد الإدارية
  const setupBoundaryLayer = (map: any) => {
    try {
      if (!map.getSource('port-said-boundary')) {
        map.addSource('port-said-boundary', {
          type: 'geojson',
          data: boundaryGeoJSON as any,
        });
      }

      if (!map.getLayer('port-said-boundary-fill')) {
        map.addLayer({
          id: 'port-said-boundary-fill',
          type: 'fill',
          source: 'port-said-boundary',
          paint: {
            'fill-color': '#0f4c81',
            'fill-opacity': 0.03,
          },
        });
      }

      if (!map.getLayer('port-said-boundary-line')) {
        map.addLayer({
          id: 'port-said-boundary-line',
          type: 'line',
          source: 'port-said-boundary',
          paint: {
            'line-color': '#0f4c81',
            'line-width': 2.5,
            'line-dasharray': [3, 2],
            'line-opacity': 0.7,
          },
        });
      }
    } catch (e) {
      console.warn('Could not add boundary layer:', e);
    }
  };

  // 3. تهيئة MapLibre GL JS بنمط OpenFreeMap المفتوح مجانًا
  useEffect(() => {
    let map: any;
    let isCancelled = false;

    async function initMapLibre() {
      if (!mapContainerRef.current) return;

      try {
        const maplibregl = await import('maplibre-gl');

        if (typeof window !== 'undefined') {
          const workerUrl = `${window.location.origin}/maplibre-gl-worker.mjs`;
          maplibregl.setWorkerUrl(workerUrl);
        }

        if (isCancelled || !mapContainerRef.current) return;

        const currentStyleUrl =
          MAP_STYLES.find((s) => s.key === selectedMapStyle)?.url ||
          'https://tiles.openfreemap.org/styles/positron';

        map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: currentStyleUrl,
          center: PORT_SAID_CENTER,
          zoom: 13.5,
          minZoom: 10.5,
          maxZoom: 18.5,
          maxBounds: PORT_SAID_MAX_BOUNDS,
          attributionControl: false,
        });

        map.addControl(
          new maplibregl.NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }),
          'top-left'
        );

        map.on('load', () => {
          if (isCancelled) return;
          mapInstanceRef.current = map;
          setMapLoaded(true);
          setupBoundaryLayer(map);
        });

        // إعادة إرفاق طبقات الحدود والمسارات عند تغيير نمط الخريطة
        map.on('styledata', () => {
          if (!isCancelled && map && map.isStyleLoaded()) {
            setupBoundaryLayer(map);
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

  // 4. تغيير نمط الخريطة ديناميكياً
  const handleSelectMapStyle = (styleKey: string) => {
    setSelectedMapStyle(styleKey);
    setShowStyleMenu(false);
    const target = MAP_STYLES.find((s) => s.key === styleKey);
    const map = mapInstanceRef.current;
    if (map && target) {
      map.setStyle(target.url);
    }
  };

  // 5. رسم علامات الأماكن المفلترة (Markers) مع بطاقات أسماء واضحة ومميزة
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    async function addMarkers() {
      const maplibregl = await import('maplibre-gl');

      filteredPlaces.forEach((place) => {
        const el = document.createElement('div');
        el.className = 'hub-map-marker group relative cursor-pointer flex flex-col items-center select-none';

        const isCurrentSelected = selectedPlace?.id === place.id;

        const markerColor =
          place.cat === 'food'
            ? '#ef4444'
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
            display: flex;
            flex-direction: column;
            align-items: center;
            transform: ${isCurrentSelected ? 'scale(1.2)' : 'scale(1)'};
            transition: transform 0.25s ease;
          ">
            <!-- Pin Icon with Teardrop Shape -->
            <div style="
              background: ${markerColor};
              width: 36px;
              height: 36px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid #ffffff;
              box-shadow: 0 4px 14px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            ">
              <span style="
                transform: rotate(45deg);
                font-size: 15px;
                line-height: 1;
              ">${symbol}</span>
            </div>

            <!-- Crisp Place Label Below Pin -->
            <div style="
              margin-top: 5px;
              background: rgba(11, 22, 36, 0.94);
              color: #ffffff;
              font-size: 11px;
              font-weight: 800;
              padding: 2px 8px;
              border-radius: 9999px;
              border: 1px solid rgba(255, 255, 255, 0.25);
              box-shadow: 0 3px 10px rgba(0,0,0,0.4);
              white-space: nowrap;
              letter-spacing: -0.2px;
              backdrop-filter: blur(4px);
              transition: all 0.2s;
            ">
              ${place.n}
            </div>
          </div>
        `;

        el.addEventListener('mouseenter', () => {
          el.style.transform = 'translateY(-6px) scale(1.15)';
          el.style.zIndex = '100';
        });
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'translateY(0) scale(1)';
          el.style.zIndex = '1';
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([place.lon, place.lat])
          .addTo(map);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedPlace(place);
          map.flyTo({
            center: [place.lon, place.lat],
            zoom: 16,
            essential: true,
            duration: 900,
          });
        });

        markersRef.current.push(marker);
      });
    }

    addMarkers();
  }, [filteredPlaces, mapLoaded, selectedPlace]);

  // 6. التعامل مع المكان المبدئي (Initial Place Deep-linking من الشات بوت)
  useEffect(() => {
    if (initialPlaceId && mapLoaded) {
      const target = validPlaces.find((p) => p.id === initialPlaceId);
      if (target) {
        setSelectedPlace(target);
        const map = mapInstanceRef.current;
        if (map) {
          map.flyTo({
            center: [target.lon, target.lat],
            zoom: 16,
            essential: true,
            duration: 1100,
          });
        }
      }
    }
  }, [initialPlaceId, mapLoaded, validPlaces]);

  // 7. رسم خط الاتجاهات المرئي (Polyline) بين موقع المستخدم والمكان المختار
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    const routeSourceId = 'user-to-place-route';
    const routeLayerId = 'user-to-place-route-line';

    if (userLocation && selectedPlace) {
      const geojsonLine = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [userLocation.lng, userLocation.lat],
            [selectedPlace.lon, selectedPlace.lat],
          ],
        },
      };

      try {
        if (map.getSource(routeSourceId)) {
          map.getSource(routeSourceId).setData(geojsonLine);
        } else {
          map.addSource(routeSourceId, {
            type: 'geojson',
            data: geojsonLine,
          });

          map.addLayer({
            id: routeLayerId,
            type: 'line',
            source: routeSourceId,
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
            },
            paint: {
              'line-color': '#059669',
              'line-width': 3.5,
              'line-dasharray': [2, 1.5],
              'line-opacity': 0.85,
            },
          });
        }
      } catch (err) {
        console.warn('Could not update route line:', err);
      }
    } else {
      try {
        if (map.getLayer(routeLayerId)) {
          map.removeLayer(routeLayerId);
        }
        if (map.getSource(routeSourceId)) {
          map.removeSource(routeSourceId);
        }
      } catch (e) {}
    }
  }, [userLocation, selectedPlace, mapLoaded]);

  // 8. فحص نصوص البحث لحصر النتائج داخل حدود بورسعيد
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

  // 9. تحديد الموقع الحالي للمستخدم بموافقته فقط
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
        const district = identifyPortSaidDistrict(lat, lng);
        setUserLocation({ lat, lng, district });

        const inside = isPointInPortSaid(lat, lng);

        const map = mapInstanceRef.current;
        if (map) {
          const maplibregl = await import('maplibre-gl');

          if (!userMarkerRef.current) {
            const userEl = document.createElement('div');
            userEl.innerHTML = `
              <div style="
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: #0284c7;
                border: 3px solid #ffffff;
                box-shadow: 0 0 0 5px rgba(2, 132, 199, 0.45);
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
              zoom: 15.5,
              essential: true,
            });
            setLocationNotice(`تم تحديد موقعك في "${district}" بنجاح 📍`);
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

  // الانتقال السريع إلى حي معين
  const handlePanToDistrict = (district: typeof PORT_SAID_DISTRICTS[0]) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo({
      center: [district.lon, district.lat],
      zoom: 15,
      essential: true,
      duration: 1000,
    });
  };

  // اختيار مكان سريع من قائمة المعالم البارزة
  const handleSelectQuickSight = (keyword: string) => {
    const found = validPlaces.find((p) => p.n.includes(keyword));
    if (found) {
      setSelectedPlace(found);
      const map = mapInstanceRef.current;
      if (map) {
        map.flyTo({
          center: [found.lon, found.lat],
          zoom: 16,
          essential: true,
          duration: 900,
        });
      }
    }
  };

  // فتح الاتجاهات في Google Maps
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
              خريطة متجهة مفتوحة المصدر مجانية ومحصورة بالكامل في الحدود الإدارية لبورسعيد
            </p>
          </div>
        </div>

        {/* Action Controls & Map Style Switcher */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          {/* Map Style Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowStyleMenu(!showStyleMenu)}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-sand-100 dark:bg-[#152332] text-ocean-900 dark:text-white text-xs font-bold border border-sand-200 dark:border-[#22354a] hover:bg-sand-200 transition"
              title="تغيير نمط الخريطة"
            >
              <Palette className="w-4 h-4 text-teal2-600" />
              <span>{MAP_STYLES.find((s) => s.key === selectedMapStyle)?.icon} النمط</span>
            </button>

            <AnimatePresence>
              {showStyleMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 5 }}
                  className="absolute left-0 mt-2 z-50 w-48 rounded-2xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#22354a] shadow-xl p-1.5 flex flex-col gap-1"
                >
                  {MAP_STYLES.map((st) => (
                    <button
                      key={st.key}
                      onClick={() => handleSelectMapStyle(st.key)}
                      type="button"
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between text-right transition ${
                        selectedMapStyle === st.key
                          ? 'bg-teal2-100 dark:bg-teal2-900/50 text-teal2-900 dark:text-teal2-200'
                          : 'hover:bg-sand-100 dark:hover:bg-[#162536] text-ocean-900 dark:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{st.icon}</span>
                        <span>{st.label}</span>
                      </span>
                      {selectedMapStyle === st.key && <span>✓</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Locate User Button */}
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

      {/* Search, Top Sights, and Filters Card */}
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

        {/* Quick Sights Highlights Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-black text-ocean-700 dark:text-white/60 shrink-0 pl-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>معالم شهيرة:</span>
          </span>
          {TOP_SIGHTS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectQuickSight(s.keyword)}
              type="button"
              className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/10 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30 hover:bg-amber-500/20 transition whitespace-nowrap flex items-center gap-1"
            >
              <span>{s.icon}</span>
              <span>{s.name}</span>
            </button>
          ))}
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

        {/* District Quick Pan Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 border-t border-sand-200/80 dark:border-[#1d2d3e] scrollbar-none">
          <span className="text-[11px] font-bold text-ocean-700 dark:text-white/60 shrink-0 pl-1">
            انتقال سريع للأحياء:
          </span>
          {PORT_SAID_DISTRICTS.map((dist, i) => (
            <button
              key={i}
              onClick={() => handlePanToDistrict(dist)}
              type="button"
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-sand-100 dark:bg-[#162738] text-ocean-800 dark:text-white/80 hover:bg-teal2-100 dark:hover:bg-teal2-900/40 hover:text-teal2-700 transition whitespace-nowrap"
            >
              📍 {dist.name}
            </button>
          ))}
        </div>

        {/* Counter of Places */}
        <div className="flex items-center justify-between text-[11px] text-ocean-700/70 dark:text-white/60 font-semibold px-1 pt-1">
          <span>
            يتم عرض <strong>{filteredPlaces.length}</strong> مكان بإحداثيات GPS دقيقة وأسماء مميزة على الخريطة
          </span>

          {missingCoordsPlaces.length > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              ({missingCoordsPlaces.length} أماكن قيد تدقيق الإحداثيات)
            </span>
          )}
        </div>
      </div>

      {/* Main Map Container using MapLibre GL */}
      <div className="relative rounded-3xl overflow-hidden border border-sand-300 dark:border-[#1d2d3e] shadow-2xl bg-sand-100 dark:bg-[#071322] h-[58vh] min-h-[460px] sm:h-[670px] w-full">
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
                <div className="p-2.5 rounded-xl bg-teal2-50 dark:bg-teal2-950/40 border border-teal2-200 dark:border-teal2-900 text-[11px] font-bold text-teal2-800 dark:text-teal2-300 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
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
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold">
                    مسار مرسوم 🟢
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                {onSelectPlace && (
                  <button
                    onClick={() => onSelectPlace(selectedPlace.id)}
                    type="button"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-ocean-900 dark:bg-white text-sand-300 dark:text-ocean-950 font-black text-xs shadow hover:opacity-90 transition text-center"
                  >
                    عرض صفحة المكان
                  </button>
                )}

                <button
                  onClick={() => handleOpenDirections(selectedPlace)}
                  type="button"
                  className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-ocean-950 font-black text-xs shadow transition flex items-center justify-center gap-1.5 shrink-0"
                  title="فتح المسار والاتجاهات في Google Maps"
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
