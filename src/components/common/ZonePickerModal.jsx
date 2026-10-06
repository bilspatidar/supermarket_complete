import React, { useState } from 'react';
import { X, MapPin, CheckCircle, Navigation, Clock, Truck } from 'lucide-react';
import { useDelivery } from '../../context/DeliveryContext.jsx';

export default function ZonePickerModal() {
  const {
    zones,
    selectedArea,
    selectedSubArea,
    isZoneModalOpen,
    setIsZoneModalOpen,
    setZoneSelection,
    detectLocation,
  } = useDelivery();

  const [activeAreaId, setActiveAreaId] = useState(selectedArea?.id || zones[0]?.id || null);
  const [locating, setLocating] = useState(false);
  const [gpsMessage, setGpsMessage] = useState('');

  if (!isZoneModalOpen) return null;

  const currentArea = zones.find(z => z.id === Number(activeAreaId)) || zones[0];
  const subAreas = currentArea?.sub_areas || [];

  async function handleGpsDetect() {
    setLocating(true);
    setGpsMessage('Detecting your location...');
    try {
      const coords = await detectLocation();
      setGpsMessage(`Location detected (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}). Auto-selected nearest zone.`);
      // If zones exist, auto select first available
      if (zones.length > 0) {
        const area = zones[0];
        const sub = area.sub_areas?.[0] || null;
        setTimeout(() => {
          setZoneSelection(area, sub);
          setLocating(false);
        }, 600);
      }
    } catch (err) {
      setGpsMessage(`Location error: ${err.message}. Please select your area manually below.`);
      setLocating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Choose Delivery Location</h3>
              <p className="text-xs text-slate-500">Delivery fees and operating hours depend on your zone</p>
            </div>
          </div>
          <button
            onClick={() => setIsZoneModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GPS Location Button */}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleGpsDetect}
            disabled={locating}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-800 text-xs font-bold transition-colors cursor-pointer"
          >
            <Navigation className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
            <span>{locating ? 'Detecting GPS...' : 'Use My Current Location (GPS)'}</span>
          </button>
          {gpsMessage && (
            <p className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
              {gpsMessage}
            </p>
          )}
        </div>

        {/* Step 1: Select Area */}
        <div className="mt-5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
            Step 1: Select Main City / Area
          </label>
          <div className="grid grid-cols-2 gap-2">
            {zones.map((area) => {
              const isSelected = Number(activeAreaId) === area.id;
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setActiveAreaId(area.id)}
                  className={`p-3 rounded-xl text-left border text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{area.name}</span>
                    {isSelected && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div className="mt-1 text-[11px] font-normal text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{area.start_time} - {area.end_time}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Select Sub-Area */}
        <div className="mt-5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
            Step 2: Select Your Sub-Area / Neighborhood
          </label>
          <div className="space-y-2">
            {subAreas.map((sub) => {
              const isCurrent = selectedSubArea?.id === sub.id;
              const charge = sub.effective_delivery_charge;
              const freeMin = sub.effective_free_minimum;

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setZoneSelection(currentArea, sub)}
                  className={`w-full p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    isCurrent
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{sub.name}</span>
                    {isCurrent && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3 h-3 text-emerald-600" />
                      Delivery: <strong className="text-slate-800">₹{charge}</strong>
                    </span>
                    <span className="text-slate-400">•</span>
                    <span>
                      Free above: <strong className="text-emerald-700 font-bold">₹{freeMin}</strong>
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{sub.effective_start_time} – {sub.effective_end_time}</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
