'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PlanResult, PlanStop } from '@/lib/plannerUtils';
import {
  PORT_SAID_CENTER,
  PORT_SAID_MAX_BOUNDS,
  isPointInPortSaid,
  identifyPortSaidDistrict,
} from '@/lib/geoUtils';
import boundaryGeoJSON from '@/lib/data/portSaidBoundary.json';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Layers,
  MapPin,
  Navigation,
  ExternalLink,
  X,
  Compass,
  Palette,
  Plus,
  Trash2,
  Flag,
  Maximize2,
  Minimize2,
  LocateFixed,
} from 'lucide-react';

export interface SuggestedMapPlace {
  id: string;
  n: string;
  cat: string;
  a: string;
  lat: number;
  lon: number;
  disc?: number;
  distanceKm?: number;
}

interface PlannerMapProps {
  plan: PlanResult | null;
  suggestedPlaces?: SuggestedMapPlace[] | null;
  startPoint?: { name: string; lat: number; lon: number } | null;
  endPoint?: { name: string; lat: number; lon: number } | null;
  userLocation?: { lat: number; lng: number; district?: string } | null;
  activeStopIndex?: number | null;
  onSelectStop?: (index: number) => void;
  onAddPlaceToPlan?: (place: SuggestedMapPlace) => void;
  onRemoveStop?: (order: number) => void;
  onSetStartPoint?: (point: { name: string; lat: number; lon: number }) => void;
  pickingPointFor?: 'start' | 'end' | null;
  onStartPickingPoint?: (type: 'start' | 'end') => void;
  onPointPicked?: (point: { name: string; lat: number; lon: number }) => void;
  onCancelPick?: () => void;
  onViewPlaceDetails?: (placeId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const MAP_STYLES = [
  { key: 'positron', label: 'ناصع (Positron)', url: 'https://tiles.openfreemap.org/styles/positron', icon: '☀️' },
  { key: 'bright', label: 'حيوي (Bright)', url: 'https://tiles.openfreemap.org/styles/bright', icon: '🏙️' },
  { key: 'liberty', label: 'معالم (Liberty)', url: 'https://tiles.openfreemap.org/styles/liberty', icon: '🗺️' },
];

export const PlannerMap: React.FC<PlannerMapProps> = ({
  plan,
  suggestedPlaces,
  startPoint,
  endPoint,
  userLocation,
  activeStopIndex,
  onSelectStop,
  onAddPlaceToPlan,
  onRemoveStop,
  onSetStartPoint,
  pickingPointFor,
  onStartPickingPoint,
  onPointPicked,
  onCancelPick,
  onViewPlaceDetails,
  isExpanded = false,
  onToggleExpand,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedMapStyle, setSelectedMapStyle] = useState('positron');
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [popupStop, setPopupStop] = useState<PlanStop | null>(null);
  const [popupSuggested, setPopupSuggested] = useState<SuggestedMapPlace | null>(null);

  // إعداد وتثبيت طبقة حدود بورسعيد الإدارية
  const setupBoundary = (map: any) => {
    try {
      if (!map.getSource('port-said-boundary')) {
        map.addSource('port-said-boundary', {
          type: 'geojson',
          data: boundaryGeoJSON as any,
        });
      }
      if (!map.getLayer('boundary-fill')) {
        map.addLayer({
          id: 'boundary-fill',
          type: 'fill',
          source: 'port-said-boundary',
          paint: {
            'fill-color': '#0f4c81',
            'fill-opacity': 0.02,
          },
        });
      }
      if (!map.getLayer('boundary-line')) {
        map.addLayer({
          id: 'boundary-line',
          type: 'line',
          source: 'port-said-boundary',
          paint: {
            'line-color': '#0f4c81',
            'line-width': 2,
            'line-dasharray': [3, 2],
            'line-opacity': 0.65,
          },
        });
      }
    } catch (e) {
      console.warn('Boundary layer setup:', e);
    }
  };

  // 1. تهيئة خريطة MapLibre بنمط OpenFreeMap
  useEffect(() => {
    let map: any;
    let isCancelled = false;

    async function initMap() {
      if (!mapContainerRef.current) return;

      try {
        const maplibregl = await import('maplibre-gl');

        if (typeof window !== 'undefined') {
          maplibregl.setWorkerUrl(`${window.location.origin}/maplibre-gl-worker.mjs`);
        }

        if (isCancelled || !mapContainerRef.current) return;

        const styleUrl =
          MAP_STYLES.find((s) => s.key === selectedMapStyle)?.url ||
          'https://tiles.openfreemap.org/styles/positron';

        map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: styleUrl,
          center: PORT_SAID_CENTER,
          zoom: 13.5,
          minZoom: 10.5,
          maxZoom: 18.5,
          maxBounds: PORT_SAID_MAX_BOUNDS,
          attributionControl: false,
        });

        map.addControl(
          new maplibregl.NavigationControl({ showCompass: true, showZoom: true }),
          'top-left'
        );

        map.on('load', () => {
          if (isCancelled) return;
          mapInstanceRef.current = map;
          setMapLoaded(true);
          setupBoundary(map);
        });

        map.on('styledata', () => {
          if (!isCancelled && map && map.isStyleLoaded()) {
            setupBoundary(map);
          }
        });
      } catch (err) {
        console.error('Failed to init PlannerMap:', err);
      }
    }

    initMap();

    return () => {
      isCancelled = true;
      if (map) {
        map.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // إعادة ضبط حجم الكانفاس عند التوسيع/التصغير
  useEffect(() => {
    if (mapInstanceRef.current) {
      const timer = setTimeout(() => {
        try {
          mapInstanceRef.current?.resize();
        } catch (e) {}
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // 2. معالجة النقر على الخريطة لتحديد نقطة بداية أو نهاية
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    const handleMapClick = (e: any) => {
      if (!pickingPointFor) return;

      const { lng, lat } = e.lngLat;
      const inside = isPointInPortSaid(lat, lng);

      if (inside && onPointPicked) {
        const district = identifyPortSaidDistrict(lat, lng);
        const pointLabel =
          pickingPointFor === 'start'
            ? `نقطة البداية (${district})`
            : `نقطة النهاية (${district})`;

        onPointPicked({
          name: pointLabel,
          lat: Number(lat.toFixed(6)),
          lon: Number(lng.toFixed(6)),
        });
      }
    };

    if (pickingPointFor) {
      map.getCanvas().style.cursor = 'crosshair';
      map.on('click', handleMapClick);
    } else {
      map.getCanvas().style.cursor = '';
    }

    return () => {
      if (map) {
        map.off('click', handleMapClick);
        map.getCanvas().style.cursor = '';
      }
    };
  }, [pickingPointFor, mapLoaded, onPointPicked]);

  // 3. رسم العلامات (المحطات، المقترحات، البداية، المستخدم)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    async function renderPins() {
      const maplibregl = await import('maplibre-gl');

      // دبوس موقع المستخدم الفعلي (إن توفر)
      if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
        const userEl = document.createElement('div');
        userEl.className = 'planner-user-pin cursor-pointer flex flex-col items-center select-none';
        userEl.innerHTML = `
          <div style="
            position: relative;
            width: 22px;
            height: 22px;
            background: #2563eb;
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 0 6px rgba(37,99,235,0.25), 0 4px 12px rgba(0,0,0,0.3);
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

      // دبوس نقطة البداية
      if (startPoint) {
        const startEl = document.createElement('div');
        startEl.className = 'planner-start-pin cursor-pointer flex flex-col items-center select-none';
        startEl.innerHTML = `
          <div style="
            background: #059669;
            color: #ffffff;
            width: 36px;
            height: 36px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid #ffffff;
            box-shadow: 0 4px 14px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
          ">
            <span style="transform: rotate(45deg);">🏁</span>
          </div>
          <div style="
            margin-top: 4px;
            background: #064e3b;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            padding: 2px 7px;
            border-radius: 9999px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
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

      // دبابيس المحطات المرقمة بالترتيب (1, 2, 3...)
      const existingStopPlaceIds = new Set<string>();

      if (plan && plan.stops) {
        plan.stops.forEach((stop, idx) => {
          existingStopPlaceIds.add(stop.placeId);
          const el = document.createElement('div');
          el.className = 'planner-stop-pin cursor-pointer flex flex-col items-center select-none transition-transform duration-200';

          const isActive = activeStopIndex === idx;

          const color =
            stop.category === 'food'
              ? '#ef4444'
              : stop.category === 'cafe'
              ? '#d97706'
              : stop.category === 'sweets'
              ? '#ec4899'
              : '#059669';

          el.innerHTML = `
            <div style="
              background: ${color};
              color: #ffffff;
              width: ${isActive ? '40px' : '34px'};
              height: ${isActive ? '40px' : '34px'};
              border-radius: 50%;
              border: 3px solid #ffffff;
              box-shadow: 0 4px 14px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: ${isActive ? '16px' : '14px'};
              font-weight: 900;
              transform: ${isActive ? 'scale(1.15)' : 'scale(1)'};
              transition: transform 0.2s;
            ">
              ${stop.order}
            </div>
            <div style="
              margin-top: 4px;
              background: rgba(11, 22, 36, 0.94);
              color: #ffffff;
              font-size: 11px;
              font-weight: 800;
              padding: 2px 8px;
              border-radius: 9999px;
              border: 1px solid rgba(255, 255, 255, 0.25);
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              white-space: nowrap;
            ">
              ${stop.name}
            </div>
          `;

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            setPopupStop(stop);
            setPopupSuggested(null);
            if (onSelectStop) onSelectStop(idx);
            map.flyTo({
              center: [stop.lon, stop.lat],
              zoom: 16,
              duration: 700,
            });
          });

          const stopMarker = new maplibregl.Marker({ element: el })
            .setLngLat([stop.lon, stop.lat])
            .addTo(map);

          markersRef.current.push(stopMarker);
        });
      }

      // دبابيس الأماكن المقترحة من الشات (Suggested Places) غير الموجودة بالفعل في الخطة
      if (Array.isArray(suggestedPlaces)) {
        suggestedPlaces.forEach((sp) => {
          if (existingStopPlaceIds.has(sp.id)) return;

          const el = document.createElement('div');
          el.className = 'planner-suggested-pin cursor-pointer flex flex-col items-center select-none group';
          el.innerHTML = `
            <div style="
              background: #0284c7;
              color: #ffffff;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: 2.5px solid #ffffff;
              box-shadow: 0 3px 12px rgba(2,132,199,0.45);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 13px;
              transition: transform 0.2s;
            ">
              📍
            </div>
            <div style="
              margin-top: 3px;
              background: #0369a1;
              color: #ffffff;
              font-size: 10px;
              font-weight: 800;
              padding: 1.5px 7px;
              border-radius: 9999px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.25);
              white-space: nowrap;
            ">
              ${sp.n}
            </div>
          `;

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            setPopupSuggested(sp);
            setPopupStop(null);
            map.flyTo({
              center: [sp.lon, sp.lat],
              zoom: 16,
              duration: 700,
            });
          });

          const suggestedMarker = new maplibregl.Marker({ element: el })
            .setLngLat([sp.lon, sp.lat])
            .addTo(map);

          markersRef.current.push(suggestedMarker);
        });
      }

      // دبوس نقطة النهاية (إذا كانت مختلفة عن البداية)
      if (endPoint && (!startPoint || startPoint.lat !== endPoint.lat || startPoint.lon !== endPoint.lon)) {
        const endEl = document.createElement('div');
        endEl.className = 'planner-end-pin cursor-pointer flex flex-col items-center select-none';
        endEl.innerHTML = `
          <div style="
            background: #dc2626;
            color: #ffffff;
            width: 36px;
            height: 36px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid #ffffff;
            box-shadow: 0 4px 14px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
          ">
            <span style="transform: rotate(45deg);">🎯</span>
          </div>
          <div style="
            margin-top: 4px;
            background: #7f1d1d;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            padding: 2px 7px;
            border-radius: 9999px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            white-space: nowrap;
          ">
            النهاية
          </div>
        `;
        const endMarker = new maplibregl.Marker({ element: endEl })
          .setLngLat([endPoint.lon, endPoint.lat])
          .addTo(map);
        markersRef.current.push(endMarker);
      }
    }

    renderPins();
  }, [plan, suggestedPlaces, startPoint, endPoint, userLocation, activeStopIndex, mapLoaded]);

  // 4. رسم خط المسار الفعلي (OSRM Street Route) وتوسيع الرؤية لتشمل كل المحطات
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    const sourceId = 'planner-route-source';
    const casingLayerId = 'planner-route-casing';
    const lineLayerId = 'planner-route-line';

    if (plan && plan.routeGeoJSON) {
      try {
        const geojson = {
          type: 'Feature',
          geometry: plan.routeGeoJSON,
        };

        if (map.getSource(sourceId)) {
          map.getSource(sourceId).setData(geojson);
        } else {
          map.addSource(sourceId, {
            type: 'geojson',
            data: geojson,
          });

          // خط كاسينج خارجي عريض للتباين العالي
          map.addLayer({
            id: casingLayerId,
            type: 'line',
            source: sourceId,
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': '#064e3b',
              'line-width': 7,
              'line-opacity': 0.6,
            },
          });

          // خط المسار الرئيسي
          map.addLayer({
            id: lineLayerId,
            type: 'line',
            source: sourceId,
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': plan.isRealStreetRoute ? '#10b981' : '#0284c7',
              'line-width': 4.5,
              'line-dasharray': plan.isRealStreetRoute ? [1] : [3, 2],
            },
          });
        }

        // تحريك الكاميرا لتحتضن جميع محطات الرحلة
        const coords = plan.routeGeoJSON.coordinates;
        if (Array.isArray(coords) && coords.length > 0) {
          import('maplibre-gl').then((maplibregl) => {
            const bounds = new maplibregl.LngLatBounds();
            coords.forEach((coord: [number, number]) => bounds.extend(coord));
            map.fitBounds(bounds, {
              padding: { top: 50, bottom: 50, left: 50, right: 50 },
              maxZoom: 16,
              duration: 900,
            });
          });
        }
      } catch (err) {
        console.warn('Could not draw route polyline:', err);
      }
    } else {
      try {
        if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
        if (map.getLayer(casingLayerId)) map.removeLayer(casingLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch (e) {}
    }
  }, [plan, mapLoaded]);

  // تغيير النمط
  const handleSelectStyle = (styleKey: string) => {
    setSelectedMapStyle(styleKey);
    setShowStyleMenu(false);
    const target = MAP_STYLES.find((s) => s.key === styleKey);
    const map = mapInstanceRef.current;
    if (map && target) {
      map.setStyle(target.url);
    }
  };

  const handleCenterOnUser = () => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 16,
        duration: 800,
      });
    }
  };

  return (
    <div className={`relative w-full h-full min-h-[380px] rounded-3xl overflow-hidden border border-slate-200 dark:border-[#1d2d3e] shadow-lg bg-slate-100 dark:bg-[#071322] transition-all duration-300 ${isExpanded ? 'min-h-[550px]' : ''}`}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px]" />

      {/* Picking Point Mode Overlay Banner */}
      {pickingPointFor && (
        <div className="absolute top-3 inset-x-3 sm:inset-x-auto sm:right-3 z-30 p-2.5 px-3.5 rounded-2xl bg-amber-500 text-ocean-950 font-black text-xs shadow-2xl flex items-center justify-between gap-3 border-2 border-white animate-pulse">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 animate-spin" />
            <span>
              انقر على أي نقطة على الخريطة لتحديد{' '}
              {pickingPointFor === 'start' ? 'نقطة الانطلاق (البداية)' : 'نقطة النهاية'}
            </span>
          </div>
          {onCancelPick && (
            <button
              onClick={onCancelPick}
              type="button"
              className="p-1 rounded-lg bg-black/15 hover:bg-black/25 text-ocean-950"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Top Map Floating Actions Bar */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 flex-wrap">
        {/* Style Selector */}
        <div className="relative">
          <button
            onClick={() => setShowStyleMenu(!showStyleMenu)}
            type="button"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/95 dark:bg-[#0c1622]/95 text-ocean-900 dark:text-white text-xs font-bold shadow-md border border-slate-200 dark:border-[#22354a] hover:bg-white transition"
            title="تغيير شكل ونمط الخريطة"
          >
            <Palette className="w-3.5 h-3.5 text-teal2-600" />
            <span className="hidden sm:inline">{MAP_STYLES.find((s) => s.key === selectedMapStyle)?.icon} النمط</span>
          </button>

          {showStyleMenu && (
            <div className="absolute left-0 mt-1.5 w-40 rounded-2xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#22354a] shadow-xl p-1.5 flex flex-col gap-1 z-30">
              {MAP_STYLES.map((st) => (
                <button
                  key={st.key}
                  onClick={() => handleSelectStyle(st.key)}
                  type="button"
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between text-right transition ${
                    selectedMapStyle === st.key
                      ? 'bg-teal2-100 dark:bg-teal2-900/50 text-teal2-900 dark:text-teal2-200'
                      : 'hover:bg-slate-100 dark:hover:bg-[#162536] text-ocean-900 dark:text-white'
                  }`}
                >
                  <span>
                    {st.icon} {st.label}
                  </span>
                  {selectedMapStyle === st.key && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Set Start Point Toggle */}
        {onStartPickingPoint && !pickingPointFor && (
          <button
            onClick={() => onStartPickingPoint('start')}
            type="button"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/95 dark:bg-[#0c1622]/95 text-ocean-900 dark:text-white text-xs font-bold shadow-md border border-slate-200 dark:border-[#22354a] hover:bg-white transition"
            title="تحديد نقطة البداية بالنقر على الخريطة"
          >
            <Flag className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">نقطة البداية</span>
          </button>
        )}

        {/* Center on user location */}
        {userLocation && (
          <button
            onClick={handleCenterOnUser}
            type="button"
            className="p-1.5 rounded-xl bg-white/95 dark:bg-[#0c1622]/95 text-blue-600 dark:text-blue-400 text-xs font-bold shadow-md border border-slate-200 dark:border-[#22354a] hover:bg-white transition"
            title="تكبير على موقعي الحالي"
          >
            <LocateFixed className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Expand / Collapse Button */}
        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            type="button"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/95 dark:bg-[#0c1622]/95 text-ocean-900 dark:text-white text-xs font-bold shadow-md border border-slate-200 dark:border-[#22354a] hover:bg-white transition"
            title={isExpanded ? 'تصغير الخريطة' : 'توسيع الخريطة'}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[11px]">تصغير</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[11px]">توسيع</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Stop Details Popup Card */}
      {popupStop && (
        <div className="absolute bottom-4 inset-x-3 sm:inset-x-auto sm:right-3 sm:w-80 z-30 p-3.5 rounded-3xl bg-white/95 dark:bg-[#0c1622]/95 backdrop-blur-md border border-slate-200 dark:border-[#22354a] shadow-2xl text-ocean-900 dark:text-white space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="w-5 h-5 rounded-full bg-ocean-900 text-sand-300 text-[11px] font-black grid place-items-center">
                  {popupStop.order}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal2-100 dark:bg-teal2-950/70 text-teal2-800 dark:text-teal2-300">
                  {popupStop.categoryLabel}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-[#152332] text-ocean-800 dark:text-white/70">
                  {popupStop.area}
                </span>
              </div>
              <h3 className="font-black text-sm text-ocean-950 dark:text-white mt-1">
                {popupStop.name}
              </h3>
            </div>

            <button
              onClick={() => setPopupStop(null)}
              type="button"
              className="w-6 h-6 rounded-full bg-slate-100 dark:bg-[#162738] text-ocean-700 dark:text-white/70 grid place-items-center transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#121f2f] text-xs font-medium space-y-1">
            <div className="flex items-center justify-between text-ocean-700 dark:text-white/70 text-[11px]">
              <span>الوصول: <strong>{popupStop.arrivalTime}</strong></span>
              <span>المدة: <strong>{popupStop.stayDurationMinutes} دقيقة</strong></span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-ocean-700 dark:text-white/70">التكلفة التقديرية:</span>
              <strong className="text-emerald-600 dark:text-emerald-400">
                {popupStop.totalCost > 0 ? `${popupStop.totalCost} ج.م` : 'مجاني تماماً'}
              </strong>
            </div>
          </div>

          <p className="text-[11px] text-ocean-700/80 dark:text-white/70 leading-relaxed font-normal">
            {popupStop.reason}
          </p>

          {/* Interactive Stop Actions */}
          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
            {onRemoveStop && (
              <button
                onClick={() => {
                  onRemoveStop(popupStop.order);
                  setPopupStop(null);
                }}
                type="button"
                className="py-1 px-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 font-bold text-[11px] transition flex items-center gap-1"
                title="حذف هذه المحطة من الخطة ومسار الشوارع"
              >
                <Trash2 className="w-3 h-3 text-rose-600" />
                <span>حذف من الخطة</span>
              </button>
            )}

            {onSetStartPoint && (
              <button
                onClick={() => {
                  onSetStartPoint({ name: popupStop.name, lat: popupStop.lat, lon: popupStop.lon });
                  setPopupStop(null);
                }}
                type="button"
                className="py-1 px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] transition flex items-center gap-1"
              >
                <Flag className="w-3 h-3 text-emerald-600" />
                <span>نقطة بداية</span>
              </button>
            )}

            <button
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${popupStop.lat},${popupStop.lon}`;
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
              type="button"
              className="py-1 px-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 font-bold text-[11px] transition flex items-center gap-1"
            >
              <span>الاتجاهات</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Suggested Place Details Popup Card */}
      {popupSuggested && (
        <div className="absolute bottom-4 inset-x-3 sm:inset-x-auto sm:right-3 sm:w-80 z-30 p-3.5 rounded-3xl bg-white/95 dark:bg-[#0c1622]/95 backdrop-blur-md border border-teal2-400/30 dark:border-teal2-500/30 shadow-2xl text-ocean-900 dark:text-white space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-100 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300">
                  {popupSuggested.cat === 'food' ? 'مطعم' : popupSuggested.cat === 'cafe' ? 'كافيه' : popupSuggested.cat === 'sweets' ? 'حلويات' : 'معلم سياحي'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-[#152332] text-ocean-800 dark:text-white/70">
                  {popupSuggested.a}
                </span>
                {popupSuggested.disc && popupSuggested.disc > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-700 dark:text-rose-300">
                    خصم {popupSuggested.disc}%
                  </span>
                ) : null}
              </div>
              <h3 className="font-black text-sm text-ocean-950 dark:text-white mt-1">
                {popupSuggested.n}
              </h3>
            </div>

            <button
              onClick={() => setPopupSuggested(null)}
              type="button"
              className="w-6 h-6 rounded-full bg-slate-100 dark:bg-[#162738] text-ocean-700 dark:text-white/70 grid place-items-center transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {typeof popupSuggested.distanceKm === 'number' && (
            <div className="text-[11px] text-teal2-700 dark:text-teal2-300 font-bold">
              يبعد عن موقعك الحالي: <strong>{popupSuggested.distanceKm} كم</strong>
            </div>
          )}

          {/* Interactive Suggested Place Actions */}
          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
            {onAddPlaceToPlan && (
              <button
                onClick={() => {
                  onAddPlaceToPlan(popupSuggested);
                  setPopupSuggested(null);
                }}
                type="button"
                className="flex-1 py-1.5 px-3 rounded-xl bg-teal2-600 hover:bg-teal2-500 text-white font-black text-xs transition flex items-center justify-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة إلى مسار الخطة</span>
              </button>
            )}

            {onSetStartPoint && (
              <button
                onClick={() => {
                  onSetStartPoint({ name: popupSuggested.n, lat: popupSuggested.lat, lon: popupSuggested.lon });
                  setPopupSuggested(null);
                }}
                type="button"
                className="py-1.5 px-2.5 rounded-xl bg-slate-100 dark:bg-[#152332] text-ocean-900 dark:text-white text-[11px] font-bold border border-slate-200 dark:border-[#22354a] hover:bg-slate-200 transition"
                title="جعله نقطة الانطلاق"
              >
                <span>انطلق من هنا</span>
              </button>
            )}

            {onViewPlaceDetails && popupSuggested.id && (
              <button
                onClick={() => onViewPlaceDetails(popupSuggested.id)}
                type="button"
                className="py-1.5 px-2.5 rounded-xl bg-slate-100 dark:bg-[#152332] text-ocean-900 dark:text-white text-[11px] font-bold border border-slate-200 dark:border-[#22354a] hover:bg-slate-200 transition"
              >
                الصفحة
              </button>
            )}
          </div>
        </div>
      )}

      {/* Attribution Footer */}
      <div className="absolute bottom-1 right-2 z-10 px-2 py-0.5 rounded bg-white/85 dark:bg-black/75 backdrop-blur-sm text-[9px] text-ocean-900 dark:text-white/80 border border-black/10 select-none">
        ©{' '}
        <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer" className="hover:underline font-bold text-teal2-700 dark:text-teal2-400">
          OpenFreeMap
        </a>{' '}
        • Roads ©{' '}
        <a href="https://project-osrm.org" target="_blank" rel="noopener noreferrer" className="hover:underline font-bold text-teal2-700 dark:text-teal2-400">
          OSRM
        </a>{' '}
        • Data ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:underline">
          OpenStreetMap contributors
        </a>
      </div>
    </div>
  );
};
