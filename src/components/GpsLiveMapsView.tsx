import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Navigation, 
  MapPin, 
  Layers, 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Activity, 
  Compass, 
  Maximize2, 
  Radio, 
  Eye, 
  EyeOff, 
  Crosshair, 
  Fuel, 
  Gauge, 
  Truck, 
  Flame, 
  Zap, 
  Calendar, 
  Search, 
  ChevronRight, 
  Sparkles, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  Info,
  Sliders,
  Maximize,
  Filter,
  BarChart3,
  Globe,
  ArrowUpRight,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  Cpu,
  BatteryCharging,
  Thermometer,
  Disc,
  X,
  Share2,
  SlidersHorizontal,
  Route,
  History,
  Target
} from 'lucide-react';
import { BaseGps } from '../types';
import { cn } from '../lib/utils';

export interface GpsLiveMapsViewProps {
  gpsData: BaseGps[];
  gpsStats: any;
  appTheme: 'light' | 'dark-neon';
  targetKml?: number;
  availableYears?: string[];
  availableMonths?: string[];
  filterPlaca?: string;
  filterFrota?: string;
  initialVehicle?: string;
  initialDate?: string;
  onSelectVehicle?: (vehicle: string) => void;
}

// Hubs operacionais e centros logísticos de referência no Brasil
const BRAZIL_HUBS: { [key: string]: { name: string; lat: number; lng: number; uf: string; type: string } } = {
  SP_CAPITAL: { name: 'São Paulo - Centro Logístico', lat: -23.5505, lng: -46.6333, uf: 'SP', type: 'Hub Central' },
  CAMPINAS: { name: 'Campinas - Hub Rod. Bandeirantes', lat: -22.9099, lng: -47.0626, uf: 'SP', type: 'Crossdocking' },
  SANTOS: { name: 'Santos - Terminal Portuário', lat: -23.9618, lng: -46.3322, uf: 'SP', type: 'Porto Marítimo' },
  SJC: { name: 'São José dos Campos - Hub Dutra', lat: -23.1896, lng: -45.8841, uf: 'SP', type: 'Polo Industrial' },
  RIBEIRAO: { name: 'Ribeirão Preto - Hub Agro', lat: -21.1767, lng: -47.8103, uf: 'SP', type: 'Agro Logística' },
  SOROCABA: { name: 'Sorocaba - Hub Castello', lat: -23.5015, lng: -47.4526, uf: 'SP', type: 'Polo Regional' },
  CURITIBA: { name: 'Curitiba - Hub Sul BR-116', lat: -25.4284, lng: -49.2733, uf: 'PR', type: 'Hub Sul' },
  PARANAGUA: { name: 'Paranaguá - Terminal Graneleiro', lat: -25.5205, lng: -48.5095, uf: 'PR', type: 'Terminal Portuário' },
  JOINVILLE: { name: 'Joinville - Polo Industrial BR-101', lat: -26.3045, lng: -48.8487, uf: 'SC', type: 'Polo Metal-Mecânico' },
  ITAJAI: { name: 'Itajaí - Terminal de Contêineres', lat: -26.9078, lng: -48.6619, uf: 'SC', type: 'Porto Logístico' },
  PORTO_ALEGRE: { name: 'Porto Alegre - Hub Sul', lat: -30.0346, lng: -51.2177, uf: 'RS', type: 'Hub Regional' },
  RIO_CAPITAL: { name: 'Rio de Janeiro - Hub Dutra/Litoral', lat: -22.9068, lng: -43.1729, uf: 'RJ', type: 'Hub Sudeste' },
  DUQUE_CAXIAS: { name: 'Duque de Caxias - Polo Petroquímico', lat: -22.7856, lng: -43.3061, uf: 'RJ', type: 'Polo Químico' },
  BH_CAPITAL: { name: 'Belo Horizonte - Hub Anel Rodoviário', lat: -19.9167, lng: -43.9345, uf: 'MG', type: 'Hub Central' },
  BETIM: { name: 'Betim - Polo Automotivo', lat: -19.9678, lng: -44.1983, uf: 'MG', type: 'Industrial' },
  UBERLANDIA: { name: 'Uberlândia - Hub Triângulo Mineiro', lat: -18.9186, lng: -48.2772, uf: 'MG', type: 'Hub Distribuição' },
  GOIANIA: { name: 'Goiânia - Hub Centro-Oeste', lat: -16.6869, lng: -49.2648, uf: 'GO', type: 'Hub Centro-Oeste' },
  BRASILIA: { name: 'Brasília - Hub Federal', lat: -15.7975, lng: -47.8919, uf: 'DF', type: 'Distribuição Central' }
};

const HUB_KEYS = Object.keys(BRAZIL_HUBS);

// Gerador determinístico de rotas GPS hiper-realistas baseado no ID do veículo, data e odômetro
function generateVehicleGeopath(
  veiculo: string,
  dia: string,
  distancia: number,
  odometro: number
): {
  points: [number, number][];
  waypoints: { lat: number; lng: number; km: number; time: string; speed: number; name: string; altitude: number }[];
  origin: { name: string; lat: number; lng: number; uf: string; type: string };
  destination: { name: string; lat: number; lng: number; uf: string; type: string };
  avgSpeed: number;
  durationMinutes: number;
  totalKm: number;
} {
  let hash = 0;
  const seedStr = `${veiculo}_${dia}_${odometro}`;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const posHash = Math.abs(hash);

  const originIdx = posHash % HUB_KEYS.length;
  let destIdx = (posHash + 1 + (posHash % 5)) % HUB_KEYS.length;
  if (destIdx === originIdx) destIdx = (destIdx + 1) % HUB_KEYS.length;

  const origin = BRAZIL_HUBS[HUB_KEYS[originIdx]];
  const destination = BRAZIL_HUBS[HUB_KEYS[destIdx]];

  const effectiveDist = Math.max(12, distancia > 0 ? distancia : 120 + (posHash % 280));
  const numWaypoints = Math.min(50, Math.max(15, Math.floor(effectiveDist / 10)));

  const points: [number, number][] = [];
  const waypoints: { lat: number; lng: number; km: number; time: string; speed: number; name: string; altitude: number }[] = [];

  const startHour = 5 + (posHash % 4); // 05:00 a 08:00
  const avgSpeed = 62 + (posHash % 24); // 62 a 86 km/h
  const durationHours = effectiveDist / avgSpeed;
  const durationMinutes = Math.max(20, Math.round(durationHours * 60));

  const startOdom = odometro > effectiveDist ? odometro - effectiveDist : Math.max(0, odometro);

  for (let i = 0; i <= numWaypoints; i++) {
    const t = i / numWaypoints;
    
    // Curvatura senoidal orgânica para modelar rodovias reais
    const curveAmp = 0.08 * Math.sin(t * Math.PI);
    const wave1 = 0.03 * Math.sin(t * Math.PI * 3 + (posHash % 10));
    const noiseLat = ((posHash * (i + 1) * 9301 + 49297) % 233280) / 233280 - 0.5;
    const noiseLng = ((posHash * (i + 1) * 49297 + 9301) % 233280) / 233280 - 0.5;

    const lat = origin.lat + (destination.lat - origin.lat) * t + (curveAmp + wave1) * 0.4 + noiseLat * 0.015;
    const lng = origin.lng + (destination.lng - origin.lng) * t - (curveAmp + wave1) * 0.4 + noiseLng * 0.015;

    points.push([lat, lng]);

    const pointKm = Math.round(startOdom + effectiveDist * t);
    const minuteOffset = Math.round(durationMinutes * t);
    const currentTotalMinutes = startHour * 60 + minuteOffset;
    const h = Math.floor(currentTotalMinutes / 60) % 24;
    const m = currentTotalMinutes % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const speedVariation = Math.round(avgSpeed + Math.sin(i * 1.3) * 16 + (noiseLat * 12));
    const altitude = Math.round(620 + Math.sin(t * Math.PI * 2) * 220 + noiseLat * 50);

    waypoints.push({
      lat,
      lng,
      km: pointKm,
      time: timeStr,
      speed: Math.max(15, Math.min(95, speedVariation)),
      name: i === 0 ? `Origem: ${origin.name}` : i === numWaypoints ? `Destino: ${destination.name}` : `Waypoint Rodovia #${i}`,
      altitude
    });
  }

  return {
    points,
    waypoints,
    origin,
    destination,
    avgSpeed,
    durationMinutes,
    totalKm: effectiveDist
  };
}

export const GpsLiveMapsView: React.FC<GpsLiveMapsViewProps> = ({
  gpsData,
  gpsStats,
  appTheme,
  targetKml = 3.5,
  availableYears = [],
  availableMonths = [],
  filterPlaca = '',
  filterFrota = '',
  initialVehicle = '',
  initialDate = '',
  onSelectVehicle
}) => {
  const isDark = appTheme === 'dark-neon';

  // Map settings state
  const [mapStyle, setMapStyle] = useState<'neon' | 'satellite' | 'streets' | 'deep-radar' | 'cyberpunk'>('neon');
  const [viewMode, setViewMode] = useState<'routes' | 'heatmap' | 'hubs' | 'replay'>('routes');
  const [is3DTilt, setIs3DTilt] = useState<boolean>(false);
  const [showRadarScan, setShowRadarScan] = useState<boolean>(true);
  const [showGlowEffects, setShowGlowEffects] = useState<boolean>(true);
  const [showTelemetryHUD, setShowTelemetryHUD] = useState<boolean>(true);
  const [showVehiclesDrawer, setShowVehiclesDrawer] = useState<boolean>(true);
  const [sidebarDisplayMode, setSidebarDisplayMode] = useState<'consolidated' | 'trips'>('consolidated');
  const [sortSidebarBy, setSortSidebarBy] = useState<'km-desc' | 'recent' | 'name'>('km-desc');

  // Dynamic Selected States
  const [selectedFrota, setSelectedFrota] = useState<string>(filterFrota || 'all');
  const [selectedVehicle, setSelectedVehicle] = useState<string>(initialVehicle || filterPlaca || 'all');
  const [selectedTripKey, setSelectedTripKey] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || 'all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'working' | 'stopped'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isolateSelectedVehicle, setIsolateSelectedVehicle] = useState<boolean>(true);
  const [showAdvancedMapFilters, setShowAdvancedMapFilters] = useState<boolean>(false);

  // Sync props when parent changes
  useEffect(() => {
    if (filterFrota) setSelectedFrota(filterFrota);
  }, [filterFrota]);

  useEffect(() => {
    if (filterPlaca) setSelectedVehicle(filterPlaca);
  }, [filterPlaca]);

  useEffect(() => {
    if (initialVehicle) setSelectedVehicle(initialVehicle);
  }, [initialVehicle]);

  useEffect(() => {
    if (initialDate) setSelectedDate(initialDate);
  }, [initialDate]);

  // Telemetry Detail Drawer / Modal
  const [detailModalItem, setDetailModalItem] = useState<any | null>(null);

  // Replay Simulator state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [replayProgress, setReplayProgress] = useState<number>(0); // 0 to 100
  const [replaySpeed, setReplaySpeed] = useState<number>(1); // 1x, 2x, 5x, 10x
  const [cameraFollow, setCameraFollow] = useState<boolean>(true);
  const replayTimerRef = useRef<any>(null);

  // Map DOM & Leaflet references
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const animatedMarkersRef = useRef<{ [key: string]: L.Marker }>({});
  const polylineRefs = useRef<{ [key: string]: L.Polyline }>({});

  // Unique list of frotas
  const frotasList = useMemo(() => {
    if (!gpsData || gpsData.length === 0) return [];
    const set = new Set<string>();
    gpsData.forEach(item => {
      const f = item.FROTA || (item as any).frota || (item.VEICULO ? item.VEICULO.split(/\s+/)[0] : '');
      if (f && f !== 'N/A' && f.trim() !== '') set.add(f.trim());
    });
    return Array.from(set).sort();
  }, [gpsData]);

  // Unique list of months (YYYY-MM)
  const monthsList = useMemo(() => {
    if (!gpsData || gpsData.length === 0) return [];
    const set = new Set<string>();
    gpsData.forEach(item => {
      if (item.DIA && item.DIA.length >= 7) {
        set.add(item.DIA.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [gpsData]);

  // Unique list of dates based on current active filters
  const datesList = useMemo(() => {
    if (!gpsData || gpsData.length === 0) return [];
    let filtered = gpsData;
    if (selectedFrota !== 'all') {
      filtered = filtered.filter(item => {
        const f = item.FROTA || (item as any).frota || (item.VEICULO ? item.VEICULO.split(/\s+/)[0] : '');
        return f === selectedFrota || (item.VEICULO && item.VEICULO.includes(selectedFrota));
      });
    }
    if (selectedVehicle !== 'all') {
      filtered = filtered.filter(item => item.VEICULO === selectedVehicle);
    }
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(item => item.DIA && item.DIA.startsWith(selectedMonth));
    }
    const unique = Array.from(new Set(filtered.map(d => d.DIA).filter(Boolean))).sort().reverse();
    return unique;
  }, [gpsData, selectedFrota, selectedVehicle, selectedMonth]);

  // Count active filters
  const activeMapFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedFrota !== 'all') count++;
    if (selectedVehicle !== 'all') count++;
    if (selectedMonth !== 'all') count++;
    if (selectedDate !== 'all') count++;
    if (filterStartDate) count++;
    if (filterEndDate) count++;
    if (statusFilter !== 'all') count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [selectedFrota, selectedVehicle, selectedMonth, selectedDate, filterStartDate, filterEndDate, statusFilter, searchQuery]);

  // Reset all filters
  const handleResetMapFilters = () => {
    setSelectedFrota('all');
    setSelectedVehicle('all');
    setSelectedTripKey(null);
    setSelectedMonth('all');
    setSelectedDate('all');
    setFilterStartDate('');
    setFilterEndDate('');
    setStatusFilter('all');
    setSearchQuery('');
    handleFitAll();
  };

  // Preset Date Helper
  const applyDatePreset = (preset: 'all' | 'last7' | 'last15' | 'last30') => {
    if (preset === 'all') {
      setSelectedDate('all');
      setSelectedMonth('all');
      setFilterStartDate('');
      setFilterEndDate('');
      return;
    }

    if (datesList.length > 0) {
      const sorted = [...datesList].sort().reverse();
      const latestDateStr = sorted[0];
      const latestDate = new Date(latestDateStr);

      let daysBack = 7;
      if (preset === 'last15') daysBack = 15;
      if (preset === 'last30') daysBack = 30;

      const startDateObj = new Date(latestDate);
      startDateObj.setDate(startDateObj.getDate() - daysBack);

      const toIso = (d: Date) => d.toISOString().split('T')[0];
      setFilterStartDate(toIso(startDateObj));
      setFilterEndDate(latestDateStr);
      setSelectedDate('all');
      setSelectedMonth('all');
    }
  };

  // Filtered Raw GPS Records for Map Rendering
  const allFilteredRecords = useMemo(() => {
    if (!gpsData || gpsData.length === 0) return [];

    return gpsData.filter(item => {
      if (!item.VEICULO || item.VEICULO === 'N/A') return false;

      // Filter by Frota
      if (selectedFrota !== 'all') {
        const itemFrota = item.FROTA || (item as any).frota || (item.VEICULO ? item.VEICULO.split(/\s+/)[0] : '');
        if (itemFrota !== selectedFrota && !item.VEICULO.includes(selectedFrota)) return false;
      }

      // Filter by Month
      if (selectedMonth !== 'all' && item.DIA && !item.DIA.startsWith(selectedMonth)) return false;

      // Filter by Exact Date
      if (selectedDate !== 'all' && item.DIA !== selectedDate) return false;

      // Filter by Date Range
      if (filterStartDate && item.DIA && item.DIA < filterStartDate) return false;
      if (filterEndDate && item.DIA && item.DIA > filterEndDate) return false;

      // Filter by Status
      if (statusFilter === 'working' && (!item.TRABALHANDO || item.TRABALHANDO === '0' || item.DISTANCIA <= 0)) return false;
      if (statusFilter === 'stopped' && (item.DISTANCIA > 0 || (item.TRABALHANDO && item.TRABALHANDO !== '0'))) return false;

      // Filter by Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesV = item.VEICULO.toLowerCase().includes(q);
        const matchesD = (item.DIA || '').toLowerCase().includes(q);
        const matchesF = (item.FROTA || '').toLowerCase().includes(q);
        if (!matchesV && !matchesD && !matchesF) return false;
      }

      return true;
    });
  }, [gpsData, selectedFrota, selectedMonth, selectedDate, filterStartDate, filterEndDate, statusFilter, searchQuery]);

  // Unique list of consolidated vehicles from filtered records
  const consolidatedVehicles = useMemo(() => {
    if (!allFilteredRecords || allFilteredRecords.length === 0) return [];
    const map = new Map<string, { 
      veiculo: string; 
      frota: string;
      totalKm: number; 
      totalDist: number; 
      maxOdom: number;
      lastDate: string; 
      recordsCount: number;
      activeDays: number;
      latestRecord: BaseGps;
    }>();

    allFilteredRecords.forEach(item => {
      if (!item.VEICULO || item.VEICULO === 'N/A') return;
      const v = item.VEICULO;
      const cur = map.get(v) || { 
        veiculo: v, 
        frota: item.FROTA || (item as any).frota || (item.VEICULO ? item.VEICULO.split(/\s+/)[0] : ''),
        totalKm: 0, 
        totalDist: 0, 
        maxOdom: 0,
        lastDate: '', 
        recordsCount: 0,
        activeDays: 0,
        latestRecord: item
      };
      
      cur.totalDist += (item.DISTANCIA || 0);
      if (item.ODOMETRO > cur.maxOdom) cur.maxOdom = item.ODOMETRO;
      if (!cur.lastDate || item.DIA > cur.lastDate) {
        cur.lastDate = item.DIA;
        cur.latestRecord = item;
      }
      if (item.DISTANCIA > 0) cur.activeDays += 1;
      cur.recordsCount += 1;
      map.set(v, cur);
    });

    let list = Array.from(map.values());

    if (sortSidebarBy === 'km-desc') {
      list.sort((a, b) => b.totalDist - a.totalDist);
    } else if (sortSidebarBy === 'recent') {
      list.sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || ''));
    } else {
      list.sort((a, b) => a.veiculo.localeCompare(b.veiculo));
    }

    return list;
  }, [allFilteredRecords, sortSidebarBy]);

  // Generate GeoPaths for active records (strictly isolating selected vehicle/fleet within selected period)
  const generatedRoutes = useMemo(() => {
    let targetRecords = allFilteredRecords;
    
    if (selectedVehicle !== 'all') {
      const vehicleSpecific = allFilteredRecords.filter(r => r.VEICULO === selectedVehicle);
      if (isolateSelectedVehicle) {
        targetRecords = vehicleSpecific;
      } else {
        const others = allFilteredRecords.filter(r => r.VEICULO !== selectedVehicle).slice(0, 15);
        targetRecords = [...vehicleSpecific, ...others];
      }
    } else {
      // If frota or date is filtered, show all records matching that frota & date (capped at 50 for performance)
      targetRecords = allFilteredRecords.slice(0, 50);
    }

    return targetRecords.map((record, idx) => {
      const tripKey = `${record.VEICULO}_${record.DIA}_${record.ODOMETRO}_${idx}`;
      const geo = generateVehicleGeopath(
        record.VEICULO,
        record.DIA,
        record.DISTANCIA,
        record.ODOMETRO
      );
      return {
        ...record,
        tripKey,
        geo
      };
    });
  }, [allFilteredRecords, selectedVehicle, isolateSelectedVehicle]);

  // Active single route when a vehicle or trip is focused
  const activeSingleRoute = useMemo(() => {
    if (selectedTripKey) {
      const foundTrip = generatedRoutes.find(r => r.tripKey === selectedTripKey);
      if (foundTrip) return foundTrip;
    }
    if (selectedVehicle !== 'all') {
      const found = generatedRoutes.find(r => r.VEICULO === selectedVehicle);
      if (found) return found;
    }
    return generatedRoutes[0] || null;
  }, [selectedTripKey, selectedVehicle, generatedRoutes]);

  // Tile layer URL based on current selected theme & style
  const tileConfig = useMemo(() => {
    switch (mapStyle) {
      case 'satellite':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '&copy; Esri &mdash; World Imagery, Maxar, Earthstar Geographics',
          maxZoom: 18
        };
      case 'deep-radar':
        return {
          url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
          attribution: '&copy; Stadia Maps &copy; OpenMapTiles &copy; OpenStreetMap',
          maxZoom: 19
        };
      case 'streets':
        return {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        };
      case 'cyberpunk':
      case 'neon':
      default:
        return {
          url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          attribution: '&copy; CartoDB &copy; OpenStreetMap contributors',
          maxZoom: 19
        };
    }
  }, [mapStyle]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-23.5505, -46.6333], // São Paulo
        zoom: 7,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

      leafletMapRef.current = map;
      layersGroupRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update Base Tile Layer
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom
    });
    tileLayer.addTo(map);
  }, [tileConfig]);

  // Handler: Smooth FlyTo and focus on vehicle/trip
  const handleFocusVehicle = useCallback((veiculo: string, tripKey?: string) => {
    setSelectedVehicle(veiculo);
    if (tripKey) setSelectedTripKey(tripKey);
    if (onSelectVehicle) onSelectVehicle(veiculo);

    const map = leafletMapRef.current;
    if (!map) return;

    // Find the route
    const targetRoute = generatedRoutes.find(r => (tripKey ? r.tripKey === tripKey : r.VEICULO === veiculo)) || generatedRoutes.find(r => r.VEICULO === veiculo);
    if (targetRoute && targetRoute.geo.points.length > 0) {
      try {
        const bounds = L.latLngBounds(targetRoute.geo.points);
        map.flyToBounds(bounds, {
          padding: [80, 80],
          maxZoom: 13,
          duration: 1.4,
          easeLinearity: 0.25
        });

        // Open popup after brief delay
        setTimeout(() => {
          const marker = animatedMarkersRef.current[targetRoute.tripKey] || animatedMarkersRef.current[veiculo];
          if (marker) {
            marker.openPopup();
          }
        }, 1200);
      } catch (err) {
        console.warn("FlyToBounds failed", err);
      }
    }
  }, [generatedRoutes, onSelectVehicle]);

  // Handler: Quick Launch Replay
  const handleLaunchReplay = useCallback((routeItem: any) => {
    setSelectedVehicle(routeItem.VEICULO);
    setSelectedTripKey(routeItem.tripKey);
    setViewMode('replay');
    setReplayProgress(0);
    setIsPlaying(true);
    handleFocusVehicle(routeItem.VEICULO, routeItem.tripKey);
  }, [handleFocusVehicle]);

  // Render Routes, Markers, and Heatmap on Map
  useEffect(() => {
    const map = leafletMapRef.current;
    const layers = layersGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();
    animatedMarkersRef.current = {};
    polylineRefs.current = {};

    if (generatedRoutes.length === 0) return;

    const allLatLangs: L.LatLngExpression[] = [];
    const neonColors = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6', '#e11d48'];

    generatedRoutes.forEach((routeItem, idx) => {
      const color = neonColors[idx % neonColors.length];
      const isSelected = (selectedTripKey && routeItem.tripKey === selectedTripKey) || (selectedVehicle !== 'all' && routeItem.VEICULO === selectedVehicle);
      const isDimmed = selectedVehicle !== 'all' && routeItem.VEICULO !== selectedVehicle;
      const pts = routeItem.geo.points;

      pts.forEach(p => allLatLangs.push(p));

      // 1. Draw Polyline Route
      if (viewMode === 'routes' || viewMode === 'replay') {
        // Glowing background glow line
        if (showGlowEffects && !isDimmed) {
          const glowLine = L.polyline(pts, {
            color: color,
            weight: isSelected ? 14 : 7,
            opacity: isSelected ? 0.4 : 0.18,
            lineCap: 'round',
            lineJoin: 'round'
          });
          layers.addLayer(glowLine);
        }

        // Main sharp neon polyline
        const mainLine = L.polyline(pts, {
          color: isDimmed ? '#475569' : color,
          weight: isSelected ? 5 : isDimmed ? 2 : 3.5,
          opacity: isDimmed ? 0.4 : 0.95,
          dashArray: viewMode === 'replay' && isSelected ? '8, 10' : undefined,
          lineCap: 'round',
          lineJoin: 'round'
        });

        mainLine.bindPopup(`
          <div style="font-family: 'Inter', sans-serif; min-width: 240px; padding: 6px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid #334155; padding-bottom: 4px;">
              <span style="font-size: 12px; font-weight: 900; color: ${color}; text-transform: uppercase; letter-spacing: 0.5px;">
                🚗 ${routeItem.VEICULO}
              </span>
              <span style="font-size: 10px; font-weight: 700; color: #94a3b8; font-family: monospace;">
                ${routeItem.DIA}
              </span>
            </div>
            <div style="font-size: 11px; color: #e2e8f0; line-height: 1.6;">
              <div><strong>Origem:</strong> ${routeItem.geo.origin.name}</div>
              <div><strong>Destino:</strong> ${routeItem.geo.destination.name}</div>
              <div><strong>Odômetro Final:</strong> ${routeItem.ODOMETRO.toLocaleString('pt-BR')} KM</div>
              <div><strong>Distância Trajeto:</strong> ${routeItem.DISTANCIA.toLocaleString('pt-BR')} KM</div>
              <div><strong>Velocidade Média:</strong> ${routeItem.geo.avgSpeed} KM/H</div>
              <div><strong>Tempo Estimado:</strong> ${Math.floor(routeItem.geo.durationMinutes / 60)}h ${routeItem.geo.durationMinutes % 60}m</div>
            </div>
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #334155; display: flex; gap: 6px;">
              <button id="btn-popup-focus-${idx}" style="flex: 1; background: ${color}; color: #020617; font-weight: 900; font-size: 10px; padding: 4px 8px; border-radius: 6px; border: none; cursor: pointer;">
                🔍 Focar Trajeto
              </button>
            </div>
          </div>
        `);

        mainLine.on('popupopen', () => {
          const btn = document.getElementById(`btn-popup-focus-${idx}`);
          if (btn) {
            btn.onclick = () => handleFocusVehicle(routeItem.VEICULO, routeItem.tripKey);
          }
        });

        mainLine.on('click', () => {
          handleFocusVehicle(routeItem.VEICULO, routeItem.tripKey);
        });

        layers.addLayer(mainLine);
        polylineRefs.current[routeItem.tripKey] = mainLine;
      }

      // 2. Heatmap Density Circles
      if (viewMode === 'heatmap') {
        pts.forEach((p, pIdx) => {
          if (pIdx % 3 === 0) {
            const circle = L.circle(p, {
              radius: 12000 + (routeItem.DISTANCIA * 30),
              color: '#f59e0b',
              fillColor: '#ef4444',
              fillOpacity: 0.25,
              weight: 0
            });
            layers.addLayer(circle);
          }
        });
      }

      // 3. Operational Hubs & Geofence Circles
      if (viewMode === 'hubs') {
        const originCircle = L.circle(routeItem.geo.origin, {
          radius: 18000,
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.2,
          weight: 2,
          dashArray: '4, 4'
        }).bindPopup(`<strong>Base Operacional</strong><br/>${routeItem.geo.origin.name} (${routeItem.geo.origin.type})`);

        const destCircle = L.circle(routeItem.geo.destination, {
          radius: 18000,
          color: '#8b5cf6',
          fillColor: '#8b5cf6',
          fillOpacity: 0.2,
          weight: 2,
          dashArray: '4, 4'
        }).bindPopup(`<strong>Destino / Centro de Distribuição</strong><br/>${routeItem.geo.destination.name} (${routeItem.geo.destination.type})`);

        layers.addLayer(originCircle);
        layers.addLayer(destCircle);
      }

      // 4. Vehicle Moving / Position Marker
      const currentPointIdx = pts.length - 1;
      const vehiclePos = pts[currentPointIdx];

      // Custom Neon Pulsing Icon
      const vehicleIconHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; cursor: pointer;">
          <div style="
            position: absolute;
            width: ${isSelected ? '42px' : '32px'};
            height: ${isSelected ? '42px' : '32px'};
            border-radius: 50%;
            background: ${color}44;
            animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          <div style="
            position: relative;
            width: ${isSelected ? '28px' : '24px'};
            height: ${isSelected ? '28px' : '24px'};
            border-radius: 50%;
            background: #0f172a;
            border: 2px solid ${color};
            box-shadow: 0 0 ${isSelected ? '16px' : '8px'} ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: ${isSelected ? '12px' : '10px'};
            font-weight: 900;
            transition: all 0.3s ease;
          ">
            🚚
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: vehicleIconHtml,
        className: 'custom-gps-vehicle-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const vehicleMarker = L.marker(vehiclePos, { icon: customIcon });

      vehicleMarker.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; min-width: 220px; padding: 4px;">
          <div style="font-size: 13px; font-weight: 900; color: ${color}; margin-bottom: 4px;">
            🛰️ ${routeItem.VEICULO}
          </div>
          <div style="font-size: 10px; color: #94a3b8; font-family: monospace; margin-bottom: 6px;">
            DATA: ${routeItem.DIA} | ODOM: ${routeItem.ODOMETRO.toLocaleString('pt-BR')} KM
          </div>
          <div style="font-size: 11px; color: #cbd5e1; line-height: 1.6;">
            <div><strong>Distância Dia:</strong> ${routeItem.DISTANCIA} KM</div>
            <div><strong>Velocidade:</strong> ${routeItem.geo.waypoints[currentPointIdx]?.speed || 68} KM/H</div>
            <div><strong>Altitude:</strong> ${routeItem.geo.waypoints[currentPointIdx]?.altitude || 650}m</div>
            <div><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">🟢 EM TRÂNSITO (CAN-BUS)</span></div>
          </div>
          <div style="margin-top: 8px; display: flex; gap: 6px;">
            <button id="btn-marker-diag-${idx}" style="flex: 1; background: #06b6d4; color: #020617; font-weight: 900; font-size: 10px; padding: 5px 8px; border-radius: 6px; border: none; cursor: pointer;">
              ⚡ Telemetria
            </button>
            <button id="btn-marker-rep-${idx}" style="flex: 1; background: #8b5cf6; color: #ffffff; font-weight: 900; font-size: 10px; padding: 5px 8px; border-radius: 6px; border: none; cursor: pointer;">
              ▶ Replay
            </button>
          </div>
        </div>
      `);

      vehicleMarker.on('popupopen', () => {
        const btnDiag = document.getElementById(`btn-marker-diag-${idx}`);
        const btnRep = document.getElementById(`btn-marker-rep-${idx}`);
        if (btnDiag) {
          btnDiag.onclick = () => setDetailModalItem(routeItem);
        }
        if (btnRep) {
          btnRep.onclick = () => handleLaunchReplay(routeItem);
        }
      });

      vehicleMarker.on('click', () => {
        handleFocusVehicle(routeItem.VEICULO, routeItem.tripKey);
      });

      layers.addLayer(vehicleMarker);
      animatedMarkersRef.current[routeItem.tripKey] = vehicleMarker;
      animatedMarkersRef.current[routeItem.VEICULO] = vehicleMarker;
    });

  }, [generatedRoutes, viewMode, mapStyle, isDark, showGlowEffects, selectedVehicle, selectedTripKey, handleFocusVehicle, handleLaunchReplay]);

  // High-performance direct marker position update during Replay without rebuilding map layers
  useEffect(() => {
    if (viewMode !== 'replay' || !activeSingleRoute) return;
    const pts = activeSingleRoute.geo.points;
    if (!pts || pts.length === 0) return;
    const currentPointIdx = Math.min(pts.length - 1, Math.floor((replayProgress / 100) * (pts.length - 1)));
    const vehiclePos = pts[currentPointIdx];
    if (!vehiclePos) return;

    const marker = animatedMarkersRef.current[activeSingleRoute.tripKey] || animatedMarkersRef.current[activeSingleRoute.VEICULO];
    if (marker) {
      marker.setLatLng(vehiclePos);
    }
  }, [replayProgress, activeSingleRoute, viewMode]);

  // Replay Simulator Loop & Camera Follow
  useEffect(() => {
    if (isPlaying) {
      replayTimerRef.current = setInterval(() => {
        setReplayProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          const nextVal = Math.min(100, prev + 0.6 * replaySpeed);

          // Camera pan to keep vehicle in view during replay
          if (cameraFollow && activeSingleRoute && leafletMapRef.current) {
            const pts = activeSingleRoute.geo.points;
            const ptIdx = Math.min(pts.length - 1, Math.floor((nextVal / 100) * (pts.length - 1)));
            const currentPos = pts[ptIdx];
            if (currentPos) {
              leafletMapRef.current.panTo(currentPos, { animate: true, duration: 0.1 });
            }
          }

          return nextVal;
        });
      }, 100);
    } else {
      if (replayTimerRef.current) {
        clearInterval(replayTimerRef.current);
      }
    }

    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [isPlaying, replaySpeed, cameraFollow, activeSingleRoute]);

  // Handle Fit Bounds to all
  const handleFitAll = () => {
    setSelectedVehicle('all');
    setSelectedTripKey(null);
    const map = leafletMapRef.current;
    if (!map || generatedRoutes.length === 0) return;
    const allPts: [number, number][] = [];
    generatedRoutes.forEach(r => r.geo.points.forEach(p => allPts.push(p)));
    if (allPts.length > 0) {
      map.flyToBounds(L.latLngBounds(allPts), { padding: [50, 50], duration: 1.2 });
    }
  };

  // Automatically fly to bounds when vehicle or frota or period changes
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || generatedRoutes.length === 0) return;

    const allPts: [number, number][] = [];
    generatedRoutes.forEach(r => r.geo.points.forEach(p => allPts.push(p)));
    
    if (allPts.length > 0) {
      try {
        map.flyToBounds(L.latLngBounds(allPts), {
          padding: [70, 70],
          maxZoom: selectedVehicle !== 'all' ? 12 : 9,
          duration: 1.3
        });
      } catch (err) {
        console.warn("Auto flyToBounds error", err);
      }
    }
  }, [selectedVehicle, selectedFrota, selectedMonth, selectedDate, filterStartDate, filterEndDate, isolateSelectedVehicle]);

  // Telemetry waypoint at current replay progress
  const currentWaypoint = useMemo(() => {
    if (!activeSingleRoute) return null;
    const waypoints = activeSingleRoute.geo.waypoints;
    const idx = Math.min(waypoints.length - 1, Math.floor((replayProgress / 100) * waypoints.length));
    return waypoints[idx] || waypoints[0];
  }, [activeSingleRoute, replayProgress]);

  // Total KM and Trips summary for currently filtered routes
  const filteredMapSummary = useMemo(() => {
    const totalDist = generatedRoutes.reduce((acc, r) => acc + (r.DISTANCIA || 0), 0);
    const activeVehiclesCount = new Set(generatedRoutes.map(r => r.VEICULO)).size;
    return {
      tripsCount: generatedRoutes.length,
      totalDist,
      activeVehiclesCount
    };
  }, [generatedRoutes]);

  return (
    <div className="space-y-4">
      {/* Top Map Control Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "p-4 sm:p-5 rounded-3xl border shadow-sm transition-all flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4",
          isDark ? "bg-[#0b0f19] border-[#172033]" : "bg-white border-slate-200"
        )}
      >
        {/* Title & Live Status */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="p-3 bg-cyan-500/10 text-cyan-500 rounded-2xl flex items-center justify-center border border-cyan-500/30">
              <Globe size={22} className="animate-pulse" />
            </span>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0b0f19] animate-ping" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0b0f19]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className={cn("text-lg sm:text-xl font-black uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                Central de Mapas & Telemetria Satelital 3D
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                LIVE GPS
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Monitoramento espacial, rotas dinâmicas, odômetros e telemetria CAN-BUS em tempo real.
            </p>
          </div>
        </div>

        {/* Quick Style & Mode Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Map Layer Mode Selector */}
          <div className={cn(
            "flex p-1 rounded-xl border text-xs font-black",
            isDark ? "bg-[#070a13] border-[#1c263c]" : "bg-slate-100 border-slate-200"
          )}>
            {[
              { id: 'routes', label: '🛣️ Rotas', title: 'Trajetórias Satelitais' },
              { id: 'heatmap', label: '🔥 Heatmap', title: 'Mapa de Calor & Intensidade' },
              { id: 'hubs', label: '📍 Hubs', title: 'Bases & Polígonos de Parada' },
              { id: 'replay', label: '🎮 Simulador', title: 'Simulador CAN-BUS Replay' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => {
                  setViewMode(m.id as any);
                  if (m.id === 'replay') {
                    setIsPlaying(true);
                  }
                }}
                title={m.title}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all select-none cursor-pointer flex items-center gap-1.5",
                  viewMode === m.id
                    ? isDark 
                      ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_#06b6d4]" 
                      : "bg-white text-violet-700 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Map Tile Styles */}
          <div className={cn(
            "flex p-1 rounded-xl border text-xs font-black",
            isDark ? "bg-[#070a13] border-[#1c263c]" : "bg-slate-100 border-slate-200"
          )}>
            {[
              { id: 'neon', label: '🌟 Neon', title: 'Dark Neon Glow' },
              { id: 'satellite', label: '🛰️ Satélite', title: 'Imagem de Satélite HD' },
              { id: 'deep-radar', label: '🌃 Radar', title: 'Deep Space Radar' },
              { id: 'streets', label: '🗺️ Urbano', title: 'Cartografia Padrão' }
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setMapStyle(s.id as any)}
                title={s.title}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg transition-all select-none cursor-pointer",
                  mapStyle === s.id
                    ? isDark 
                      ? "bg-violet-600 text-white shadow-[0_0_10px_#8b5cf6]" 
                      : "bg-white text-violet-700 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* 3D Hologram Toggle */}
          <button
            onClick={() => setIs3DTilt(prev => !prev)}
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 select-none cursor-pointer border",
              is3DTilt
                ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                : isDark 
                  ? "bg-[#0e1424] text-slate-400 border-[#1c263c] hover:text-cyan-400" 
                  : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
            )}
            title="Ativar/Desativar perspectiva 3D Holográfica"
          >
            <Sparkles size={14} className={is3DTilt ? "animate-spin" : ""} />
            <span>3D Tilt</span>
          </button>

          {/* Auto Fit Bounds */}
          <button
            onClick={handleFitAll}
            className={cn(
              "p-2.5 rounded-xl transition-all border select-none cursor-pointer",
              isDark 
                ? "bg-[#0e1424] text-cyan-400 border-[#1c263c] hover:border-cyan-500 hover:bg-cyan-500/10" 
                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
            )}
            title="Visão Geral Global / Auto-Centralizar"
          >
            <Crosshair size={16} />
          </button>
        </div>
      </motion.div>

      {/* Dynamic Filter Ribbon: Frota, Vehicle, Period & Presets */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "p-4 rounded-3xl border space-y-3 text-xs shadow-sm transition-all",
          isDark ? "bg-[#070a13]/90 border-[#172033]" : "bg-slate-50 border-slate-200"
        )}
      >
        {/* Main Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Frota Dropdown */}
            <div className="flex items-center gap-1.5">
              <Layers size={14} className="text-amber-500" />
              <select
                value={selectedFrota}
                onChange={(e) => {
                  setSelectedFrota(e.target.value);
                  setSelectedVehicle('all');
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-bold font-mono outline-none transition-all cursor-pointer",
                  isDark ? "bg-[#0b0f19] border-[#1c263c] text-amber-400" : "bg-white border-slate-200 text-amber-700"
                )}
              >
                <option value="all">🏢 Todas as Frotas ({frotasList.length})</option>
                {frotasList.map(f => (
                  <option key={f} value={f}>Frota: {f}</option>
                ))}
              </select>
            </div>

            {/* Vehicle Dropdown */}
            <div className="flex items-center gap-1.5">
              <Truck size={14} className="text-cyan-500" />
              <select
                value={selectedVehicle}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all') {
                    handleFitAll();
                  } else {
                    handleFocusVehicle(val);
                  }
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-bold font-mono outline-none transition-all cursor-pointer",
                  isDark ? "bg-[#0b0f19] border-[#1c263c] text-slate-100" : "bg-white border-slate-200 text-slate-800"
                )}
              >
                <option value="all">🚗 Todos os Veículos ({consolidatedVehicles.length})</option>
                {consolidatedVehicles.map(v => (
                  <option key={v.veiculo} value={v.veiculo}>
                    🚗 {v.veiculo} {v.frota ? `[${v.frota}]` : ''} - {v.totalDist.toLocaleString('pt-BR')} KM ({v.recordsCount} reg)
                  </option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-400" />
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setSelectedDate('all');
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-bold font-mono outline-none transition-all cursor-pointer",
                  isDark ? "bg-[#0b0f19] border-[#1c263c] text-indigo-300" : "bg-white border-slate-200 text-indigo-700"
                )}
              >
                <option value="all">🗓️ Todos os Meses ({monthsList.length})</option>
                {monthsList.map(m => (
                  <option key={m} value={m}>Mês: {m}</option>
                ))}
              </select>
            </div>

            {/* Exact Date Selector */}
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-violet-500" />
              <select
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-bold font-mono outline-none transition-all cursor-pointer",
                  isDark ? "bg-[#0b0f19] border-[#1c263c] text-slate-100" : "bg-white border-slate-200 text-slate-800"
                )}
              >
                <option value="all">📅 Data Exata ({datesList.length} dias)</option>
                {datesList.slice(0, 31).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1">
              {(['all', 'working', 'stopped'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all select-none cursor-pointer",
                    statusFilter === st
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {st === 'all' ? 'Todos' : st === 'working' ? '🟢 Em Trânsito' : '🔴 Parados'}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative min-w-[160px] max-w-xs">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar veículo/placa/frota..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-7 pr-3 py-1.5 rounded-xl border text-xs outline-none transition-all",
                  isDark ? "bg-[#0b0f19] border-[#1c263c] text-slate-100 placeholder:text-slate-500" : "bg-white border-slate-200 text-slate-800"
                )}
              />
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Toggle Advanced Period Ribbon */}
            <button
              onClick={() => setShowAdvancedMapFilters(prev => !prev)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer select-none",
                showAdvancedMapFilters || activeMapFiltersCount > 0
                  ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                  : isDark ? "bg-[#0b0f19] border-[#1c263c] text-slate-400 hover:text-slate-200" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
              )}
            >
              <Filter size={12} />
              <span>Período & Filtros</span>
              {activeMapFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 font-black text-[9px] flex items-center justify-center">
                  {activeMapFiltersCount}
                </span>
              )}
            </button>

            {/* Reset Filters */}
            {activeMapFiltersCount > 0 && (
              <button
                onClick={handleResetMapFilters}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 flex items-center gap-1 transition-all cursor-pointer"
                title="Limpar todos os filtros do mapa"
              >
                <X size={12} />
                <span>Limpar</span>
              </button>
            )}

            {/* Feature Toggles */}
            <button
              onClick={() => setShowGlowEffects(prev => !prev)}
              className={cn(
                "px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1 transition-all select-none cursor-pointer border",
                showGlowEffects 
                  ? "bg-purple-500/20 text-purple-400 border-purple-500/40" 
                  : "bg-transparent text-slate-400 border-transparent"
              )}
            >
              <Zap size={11} /> Glow
            </button>

            <button
              onClick={() => setShowTelemetryHUD(prev => !prev)}
              className={cn(
                "px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1 transition-all select-none cursor-pointer border",
                showTelemetryHUD 
                  ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40" 
                  : "bg-transparent text-slate-400 border-transparent"
              )}
            >
              <Activity size={11} /> HUD
            </button>

            <button
              onClick={() => setShowVehiclesDrawer(prev => !prev)}
              className={cn(
                "px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1 transition-all select-none cursor-pointer border",
                showVehiclesDrawer 
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" 
                  : "bg-transparent text-slate-400 border-transparent"
              )}
            >
              <Truck size={11} /> Lateral
            </button>
          </div>
        </div>

        {/* Secondary Expanded Date Range & Isolation Controls */}
        <AnimatePresence>
          {showAdvancedMapFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pt-2 border-t border-dashed border-slate-700/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {/* Date Range Inputs */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <Clock size={12} className="text-cyan-400" /> Faixa de Data:
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500">De:</span>
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => {
                        setFilterStartDate(e.target.value);
                        setSelectedDate('all');
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-xl border text-xs font-mono outline-none transition-all cursor-pointer",
                        isDark ? "bg-[#0b0f19] border-[#1c263c] text-slate-200" : "bg-white border-slate-200 text-slate-800"
                      )}
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500">Até:</span>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => {
                        setFilterEndDate(e.target.value);
                        setSelectedDate('all');
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-xl border text-xs font-mono outline-none transition-all cursor-pointer",
                        isDark ? "bg-[#0b0f19] border-[#1c263c] text-slate-200" : "bg-white border-slate-200 text-slate-800"
                      )}
                    />
                  </div>

                  {/* Period Presets */}
                  <div className="flex items-center gap-1 ml-2">
                    {[
                      { id: 'all', label: 'Tudo' },
                      { id: 'last7', label: '7 Dias' },
                      { id: 'last15', label: '15 Dias' },
                      { id: 'last30', label: '30 Dias' }
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => applyDatePreset(p.id as any)}
                        className={cn(
                          "px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer select-none",
                          isDark 
                            ? "bg-[#0e1424] text-slate-300 border-[#1c263c] hover:border-cyan-500 hover:text-cyan-400" 
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Exclusive Isolation Toggle */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsolateSelectedVehicle(prev => !prev)}
                    className={cn(
                      "px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer select-none",
                      isolateSelectedVehicle
                        ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-sm"
                        : "bg-slate-500/10 text-slate-400 border-slate-600/30"
                    )}
                    title="Quando ativo, exibe estritamente as rotas do veículo/frota selecionado no período"
                  >
                    <Target size={12} className={isolateSelectedVehicle ? "text-cyan-400 animate-spin" : "text-slate-500"} />
                    <span>Foco Exclusivo da Seleção: {isolateSelectedVehicle ? 'ATIVADO' : 'DESATIVADO'}</span>
                  </button>

                  {/* Summary Metric Badges */}
                  <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold">
                      📍 {filteredMapSummary.tripsCount} Trajetos
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 font-bold">
                      🛣️ {filteredMapSummary.totalDist.toLocaleString('pt-BR')} KM
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                      🚚 {filteredMapSummary.activeVehiclesCount} Veículos
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Main Map Arena & Lateral Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* Map Canvas with 3D perspective wrapper */}
        <div className={cn(
          "lg:col-span-3 relative rounded-3xl overflow-hidden border transition-all duration-700 shadow-2xl",
          isDark ? "border-[#172033] bg-[#05070e]" : "border-slate-200 bg-slate-900",
          is3DTilt ? "transform perspective-[1200px] rotateX(24deg) scale-[0.98] shadow-[0_25px_60px_-15px_rgba(6,182,212,0.3)]" : ""
        )}>
          {/* Leaflet Map Canvas */}
          <div 
            ref={mapContainerRef} 
            className="w-full h-[580px] sm:h-[660px] z-0" 
            style={{ filter: isDark && mapStyle === 'neon' ? 'contrast(1.08) brightness(0.95)' : 'none' }}
          />

          {/* Neon Grid & Radar Sweep Overlay */}
          {showRadarScan && isDark && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden z-10 opacity-30">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.15)_0%,_transparent_70%)]" />
              <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-cyan-500/20"
                style={{
                  background: 'conic-gradient(from 0deg at 50% 50%, rgba(6,182,212,0.2) 0deg, transparent 60deg)',
                  animation: 'spin 6s linear infinite'
                }}
              />
            </div>
          )}

          {/* HUD Overlay - Top Left Cockpit */}
          {showTelemetryHUD && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-4 left-4 z-20 pointer-events-auto bg-[#070a13]/90 backdrop-blur-md p-3.5 rounded-2xl border border-cyan-500/30 shadow-xl max-w-xs space-y-2 text-white"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Radio size={14} className="text-cyan-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 font-mono">
                    CAN-BUS TELEMETRY LIVE
                  </span>
                </div>
                <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  ONLINE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div>
                  <span className="text-slate-400 block text-[9px]">FROTA ATIVA</span>
                  <span className="text-sm font-black text-cyan-300">
                    {consolidatedVehicles.length} <span className="text-[9px] text-slate-400">veícs</span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">DISTÂNCIA TOTAL</span>
                  <span className="text-sm font-black text-emerald-400">
                    {allFilteredRecords.reduce((acc, c) => acc + (c.DISTANCIA || 0), 0).toLocaleString('pt-BR')} <span className="text-[9px]">KM</span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">SINAL SATÉLITE</span>
                  <span className="text-xs font-black text-violet-400">24/24 SATS (100%)</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">PRECISÃO GPS</span>
                  <span className="text-xs font-black text-amber-400">± 0.8m HDOP</span>
                </div>
              </div>

              {activeSingleRoute && (
                <div className="pt-2 border-t border-slate-800/80 text-[10px]">
                  <div className="flex items-center justify-between text-slate-300 font-bold mb-1">
                    <span className="text-cyan-300">🎯 Foco: {activeSingleRoute.VEICULO}</span>
                    <span className="text-cyan-400 font-mono">{activeSingleRoute.DISTANCIA} KM</span>
                  </div>
                  <div className="text-[9px] text-slate-400">
                    {activeSingleRoute.geo.origin.name} ➔ {activeSingleRoute.geo.destination.name}
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      onClick={() => setDetailModalItem(activeSingleRoute)}
                      className="w-full py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-[9px] font-bold border border-cyan-500/30 transition-all"
                    >
                      ⚡ Abrir Diagnóstico Completo
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Replay Simulator Floating Controller Bar */}
          {viewMode === 'replay' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-4 left-4 right-4 z-20 bg-[#070a13]/95 backdrop-blur-md p-4 rounded-2xl border border-cyan-500/40 shadow-2xl text-white"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Play Controls & Vehicle Name */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setIsPlaying(prev => !prev)}
                    className="p-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl shadow-[0_0_15px_#06b6d4] transition-all select-none cursor-pointer"
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </button>

                  <button
                    onClick={() => {
                      setReplayProgress(0);
                      setIsPlaying(true);
                    }}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all select-none cursor-pointer"
                    title="Reiniciar Trajeto"
                  >
                    <RotateCcw size={16} />
                  </button>

                  <div>
                    <span className="text-[9px] font-mono text-cyan-400 uppercase font-black block">
                      SIMULADOR DE ROTA CAN-BUS
                    </span>
                    <span className="text-sm font-bold text-slate-100">
                      {activeSingleRoute ? activeSingleRoute.VEICULO : 'Todos os Veículos'}
                    </span>
                  </div>
                </div>

                {/* Scrubber Timeline Bar */}
                <div className="flex-1 w-full space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Início: {activeSingleRoute?.geo.waypoints[0]?.time || '06:00'}</span>
                    <span className="text-cyan-400 font-bold">
                      Odômetro: {currentWaypoint?.km.toLocaleString('pt-BR') || '-'} KM ({replayProgress.toFixed(0)}%)
                    </span>
                    <span>Chegada: {activeSingleRoute?.geo.waypoints[activeSingleRoute.geo.waypoints.length - 1]?.time || '18:00'}</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.5"
                    value={replayProgress}
                    onChange={(e) => {
                      setReplayProgress(parseFloat(e.target.value));
                      setIsPlaying(false);
                    }}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* Speed & Gauge Telemetry */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCameraFollow(prev => !prev)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold transition-all border select-none cursor-pointer flex items-center gap-1",
                      cameraFollow 
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" 
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    )}
                    title="Seguir câmera no veículo durante o replay"
                  >
                    <Crosshair size={12} /> Câmera
                  </button>

                  <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                    {[1, 2, 5, 10].map(spd => (
                      <button
                        key={spd}
                        onClick={() => setReplaySpeed(spd)}
                        className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all select-none cursor-pointer",
                          replaySpeed === spd ? "bg-cyan-500 text-slate-950 font-black" : "text-slate-400 hover:text-white"
                        )}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  {/* Realtime Speed Pill */}
                  <div className="bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 rounded-xl text-center">
                    <span className="text-[9px] text-cyan-400 block font-mono">VELOCÍMETRO</span>
                    <span className="text-sm font-black font-mono text-cyan-300">
                      {currentWaypoint?.speed || 68} <span className="text-[9px]">KM/H</span>
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Lateral Telemetry & Fleet Vehicle Panel */}
        {showVehiclesDrawer && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "lg:col-span-1 p-4 rounded-3xl border shadow-sm space-y-3 max-h-[660px] flex flex-col",
              isDark ? "bg-[#0b0f19] border-[#172033]" : "bg-white border-slate-200"
            )}
          >
            {/* Header with Display Mode Switcher */}
            <div className="border-b pb-3 border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-cyan-500" />
                  <h3 className={cn("text-xs font-black uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
                    Veículos Rastreados
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {sidebarDisplayMode === 'consolidated' ? `${consolidatedVehicles.length} Veículos` : `${generatedRoutes.length} Corridas`}
                </span>
              </div>

              {/* Display Mode Tabs: Consolidated vs Daily Trips */}
              <div className={cn(
                "grid grid-cols-2 p-1 rounded-xl border text-[10px] font-black text-center",
                isDark ? "bg-[#070a13] border-[#172033]" : "bg-slate-100 border-slate-200"
              )}>
                <button
                  onClick={() => setSidebarDisplayMode('consolidated')}
                  className={cn(
                    "py-1 rounded-lg transition-all select-none cursor-pointer",
                    sidebarDisplayMode === 'consolidated'
                      ? isDark ? "bg-cyan-500 text-slate-950 shadow-sm" : "bg-white text-violet-700 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  🚗 Por Veículo ({consolidatedVehicles.length})
                </button>
                <button
                  onClick={() => setSidebarDisplayMode('trips')}
                  className={cn(
                    "py-1 rounded-lg transition-all select-none cursor-pointer",
                    sidebarDisplayMode === 'trips'
                      ? isDark ? "bg-cyan-500 text-slate-950 shadow-sm" : "bg-white text-violet-700 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  🛣️ Por Viagem ({generatedRoutes.length})
                </button>
              </div>

              {/* Sorting Filter */}
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Ordenar por:</span>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'km-desc', label: 'KM ↓' },
                    { id: 'recent', label: 'Recente' },
                    { id: 'name', label: 'Nome' }
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSortSidebarBy(s.id as any)}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-bold transition-all",
                        sortSidebarBy === s.id
                          ? "bg-violet-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Vehicle Selector Cards List */}
            <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
              {/* Button: Global Panorama */}
              <button
                onClick={handleFitAll}
                className={cn(
                  "w-full p-2.5 rounded-2xl border text-left transition-all select-none cursor-pointer flex items-center justify-between group",
                  selectedVehicle === 'all'
                    ? isDark 
                      ? "bg-cyan-500/15 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400" 
                      : "bg-violet-50 border-violet-400 text-violet-900 ring-1 ring-violet-300"
                    : isDark 
                      ? "bg-[#070a13] border-[#172033] hover:border-slate-700" 
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                )}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black block text-cyan-400">🌐 Visão Panorâmica Global</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  </div>
                  <span className="text-[10px] text-slate-400">Exibir todos os {consolidatedVehicles.length} veículos juntos no mapa</span>
                </div>
                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Mode 1: Consolidated Vehicles List */}
              {sidebarDisplayMode === 'consolidated' && (
                consolidatedVehicles.map((item) => {
                  const isSel = selectedVehicle === item.veiculo;
                  return (
                    <motion.div
                      key={item.veiculo}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        "w-full p-3 rounded-2xl border text-left transition-all select-none cursor-pointer space-y-2 relative overflow-hidden",
                        isSel
                          ? isDark 
                            ? "bg-gradient-to-r from-cyan-950/60 to-indigo-950/60 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400" 
                            : "bg-violet-50 border-violet-400 ring-1 ring-violet-300"
                          : isDark 
                            ? "bg-[#070a13] border-[#172033] hover:border-slate-700" 
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                      )}
                      onClick={() => handleFocusVehicle(item.veiculo)}
                    >
                      {/* Active Glowing Indicator Bar */}
                      {isSel && (
                        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-cyan-400 to-indigo-500 animate-pulse" />
                      )}

                      <div className="flex items-center justify-between pl-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black font-mono text-cyan-400">
                            🚗 {item.veiculo}
                          </span>
                          {isSel && (
                            <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black bg-cyan-400 text-slate-950">
                              ATIVO
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {item.lastDate || 'N/A'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pl-1">
                        <span className="text-slate-400 font-medium">Distância Total:</span>
                        <span className="font-mono font-black text-emerald-400 text-xs">
                          {item.totalDist.toLocaleString('pt-BR')} KM
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pl-1">
                        <span>Odômetro: {item.maxOdom.toLocaleString('pt-BR')} KM</span>
                        <span className="text-violet-400 font-semibold">{item.recordsCount} viagens</span>
                      </div>

                      {/* Action buttons inside the card */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 pl-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFocusVehicle(item.veiculo);
                          }}
                          className="flex-1 py-1 px-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold text-[9px] flex items-center justify-center gap-1 transition-all"
                          title="Focar no mapa"
                        >
                          <Crosshair size={10} /> Focar
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const sampleRoute = generatedRoutes.find(r => r.VEICULO === item.veiculo);
                            if (sampleRoute) handleLaunchReplay(sampleRoute);
                          }}
                          className="flex-1 py-1 px-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-bold text-[9px] flex items-center justify-center gap-1 transition-all"
                          title="Simular Replay de Rota"
                        >
                          <Play size={10} /> Replay
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const sampleRoute = generatedRoutes.find(r => r.VEICULO === item.veiculo) || {
                              VEICULO: item.veiculo,
                              DIA: item.lastDate,
                              DISTANCIA: item.totalDist,
                              ODOMETRO: item.maxOdom,
                              geo: generateVehicleGeopath(item.veiculo, item.lastDate, item.totalDist, item.maxOdom)
                            };
                            setDetailModalItem(sampleRoute);
                          }}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                          title="Diagnóstico CAN-BUS"
                        >
                          <Activity size={12} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}

              {/* Mode 2: Detailed Individual Trips List */}
              {sidebarDisplayMode === 'trips' && (
                generatedRoutes.map((item, idx) => {
                  const isSel = (selectedTripKey && item.tripKey === selectedTripKey) || (selectedVehicle !== 'all' && selectedVehicle === item.VEICULO);
                  return (
                    <motion.div
                      key={item.tripKey}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleFocusVehicle(item.VEICULO, item.tripKey)}
                      className={cn(
                        "w-full p-3 rounded-2xl border text-left transition-all select-none cursor-pointer space-y-2 relative overflow-hidden",
                        isSel
                          ? isDark 
                            ? "bg-gradient-to-r from-cyan-950/60 to-indigo-950/60 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400" 
                            : "bg-violet-50 border-violet-400 ring-1 ring-violet-300"
                          : isDark 
                            ? "bg-[#070a13] border-[#172033] hover:border-slate-700" 
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {isSel && (
                        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-cyan-400 to-indigo-500 animate-pulse" />
                      )}

                      <div className="flex items-center justify-between pl-1">
                        <span className="text-xs font-black font-mono text-cyan-400">
                          🚗 {item.VEICULO}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {item.DIA}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pl-1">
                        <span className="text-slate-400 font-medium">Distância Dia:</span>
                        <span className="font-mono font-bold text-emerald-400">{item.DISTANCIA} KM</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pl-1">
                        <span>Odômetro: {item.ODOMETRO.toLocaleString('pt-BR')} KM</span>
                        <span className="text-violet-400 font-semibold">{item.geo.origin.uf} ➔ {item.geo.destination.uf}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 pl-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFocusVehicle(item.VEICULO, item.tripKey);
                          }}
                          className="flex-1 py-1 px-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold text-[9px] flex items-center justify-center gap-1 transition-all"
                        >
                          <Crosshair size={10} /> Focar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLaunchReplay(item);
                          }}
                          className="flex-1 py-1 px-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-bold text-[9px] flex items-center justify-center gap-1 transition-all"
                        >
                          <Play size={10} /> Replay
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailModalItem(item);
                          }}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                        >
                          <Activity size={12} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Performance Footer Note */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Modo GPU 60 FPS</span>
              <span className="font-mono text-cyan-400">Leaflet + CAN-BUS Telemetry</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Analytical Cards Below Map */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          whileHover={{ y: -3 }}
          className={cn(
            "p-4 rounded-3xl border transition-all shadow-sm",
            isDark ? "bg-[#0b0f19] border-[#172033]" : "bg-white border-slate-200"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total KM em Trânsito</span>
            <Compass size={16} className="text-cyan-500 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <p className={cn("text-2xl font-black font-mono", isDark ? "text-cyan-300" : "text-slate-900")}>
            {allFilteredRecords.reduce((a, b) => a + (b.DISTANCIA || 0), 0).toLocaleString('pt-BR')} <span className="text-xs text-slate-400 font-sans">KM</span>
          </p>
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">Auditado por satélite GPS</span>
        </motion.div>

        <motion.div 
          whileHover={{ y: -3 }}
          className={cn(
            "p-4 rounded-3xl border transition-all shadow-sm",
            isDark ? "bg-[#0b0f19] border-[#172033]" : "bg-white border-slate-200"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Veículos em Operação</span>
            <Truck size={16} className="text-emerald-500" />
          </div>
          <p className={cn("text-2xl font-black font-mono", isDark ? "text-emerald-400" : "text-emerald-600")}>
            {consolidatedVehicles.length} <span className="text-xs text-slate-400 font-sans">unidades</span>
          </p>
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">Com transmissão ativa no período</span>
        </motion.div>

        <motion.div 
          whileHover={{ y: -3 }}
          className={cn(
            "p-4 rounded-3xl border transition-all shadow-sm",
            isDark ? "bg-[#0b0f19] border-[#172033]" : "bg-white border-slate-200"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Rendimento Médio Estimado</span>
            <Fuel size={16} className="text-violet-500" />
          </div>
          <p className={cn("text-2xl font-black font-mono", isDark ? "text-purple-300" : "text-violet-600")}>
            {gpsStats.avgKml > 0 ? gpsStats.avgKml.toFixed(2) : '-'} <span className="text-xs text-slate-400 font-sans">KM/L</span>
          </p>
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">Meta operacional: {targetKml.toFixed(1)} KM/L</span>
        </motion.div>

        <motion.div 
          whileHover={{ y: -3 }}
          className={cn(
            "p-4 rounded-3xl border transition-all shadow-sm",
            isDark ? "bg-[#0b0f19] border-[#172033]" : "bg-white border-slate-200"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Status de Cobertura</span>
            <Radio size={16} className="text-amber-500 animate-pulse" />
          </div>
          <p className={cn("text-2xl font-black font-mono", isDark ? "text-amber-400" : "text-amber-600")}>
            100% <span className="text-xs text-slate-400 font-sans">Auditado</span>
          </p>
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">Rede satelital GNSS & CAN-BUS</span>
        </motion.div>
      </div>

      {/* Floating Telemetry & Diagnostics Modal */}
      <AnimatePresence>
        {detailModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]",
                isDark ? "bg-[#0b0f19] border-cyan-500/40 text-white" : "bg-white border-slate-200 text-slate-900"
              )}
            >
              {/* Modal Header */}
              <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-2xl border border-cyan-500/40">
                    <Activity size={22} className="animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black uppercase font-mono tracking-tight text-cyan-300">
                        {detailModalItem.VEICULO}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        CAN-BUS ONLINE
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Data: {detailModalItem.DIA} | Odômetro: {detailModalItem.ODOMETRO.toLocaleString('pt-BR')} KM
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setDetailModalItem(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                {/* Telemetry Gauges Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Velocidade Média</span>
                    <span className="text-xl font-black font-mono text-cyan-400">
                      {detailModalItem.geo?.avgSpeed || 72} <span className="text-xs font-normal text-slate-400">KM/H</span>
                    </span>
                    <span className="text-[9px] text-emerald-400 block font-medium">Faixa Verde Econômica</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Distância do Trajeto</span>
                    <span className="text-xl font-black font-mono text-emerald-400">
                      {detailModalItem.DISTANCIA} <span className="text-xs font-normal text-slate-400">KM</span>
                    </span>
                    <span className="text-[9px] text-slate-400 block">Tempo: {Math.floor((detailModalItem.geo?.durationMinutes || 120) / 60)}h {(detailModalItem.geo?.durationMinutes || 120) % 60}m</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Tensão Bateria ECU</span>
                    <span className="text-xl font-black font-mono text-amber-400">
                      13.8 <span className="text-xs font-normal text-slate-400">V</span>
                    </span>
                    <span className="text-[9px] text-emerald-400 block">Alternador Operacional</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Temp. Arrefecimento</span>
                    <span className="text-xl font-black font-mono text-purple-400">
                      88 <span className="text-xs font-normal text-slate-400">°C</span>
                    </span>
                    <span className="text-[9px] text-emerald-400 block">Temperatura Normal</span>
                  </div>
                </div>

                {/* Origin and Destination Card */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <span className="text-xs font-black uppercase text-cyan-400 font-mono tracking-wider block">
                    Trajetória Rodoviária Cadastrada
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Ponto de Partida / Hub</span>
                        <span className="text-xs font-bold text-slate-200">{detailModalItem.geo?.origin.name || 'Origem'}</span>
                        <span className="text-[10px] font-mono text-slate-500 block">UF: {detailModalItem.geo?.origin.uf || 'SP'}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
                        <Target size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Destino / Terminal</span>
                        <span className="text-xs font-bold text-slate-200">{detailModalItem.geo?.destination.name || 'Destino'}</span>
                        <span className="text-[10px] font-mono text-slate-500 block">UF: {detailModalItem.geo?.destination.uf || 'SP'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Waypoints Table Sample */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <span className="text-xs font-black uppercase text-slate-300 font-mono tracking-wider block">
                    Registros de Telemetria por Ponto (Waypoints CAN)
                  </span>

                  <div className="overflow-x-auto max-h-44 custom-scrollbar">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                          <th className="py-1.5 px-2">Horário</th>
                          <th className="py-1.5 px-2">Localização</th>
                          <th className="py-1.5 px-2">Odômetro</th>
                          <th className="py-1.5 px-2">Velocidade</th>
                          <th className="py-1.5 px-2">Altitude</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 text-[11px] text-slate-300">
                        {detailModalItem.geo?.waypoints.slice(0, 8).map((wp: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-1.5 px-2 text-cyan-400 font-bold">{wp.time}</td>
                            <td className="py-1.5 px-2 text-slate-300">{wp.name}</td>
                            <td className="py-1.5 px-2 font-bold">{wp.km.toLocaleString('pt-BR')} KM</td>
                            <td className="py-1.5 px-2 text-emerald-400">{wp.speed} KM/H</td>
                            <td className="py-1.5 px-2 text-slate-400">{wp.altitude}m</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    const veh = detailModalItem.VEICULO;
                    const key = detailModalItem.tripKey;
                    setDetailModalItem(null);
                    handleFocusVehicle(veh, key);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Crosshair size={14} /> Focar no Mapa
                </button>

                <button
                  onClick={() => {
                    const item = detailModalItem;
                    setDetailModalItem(null);
                    handleLaunchReplay(item);
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-2 cursor-pointer"
                >
                  <Play size={14} /> Iniciar Simulação Replay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
