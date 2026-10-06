import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client.js';

const DeliveryContext = createContext();

export function DeliveryProvider({ children }) {
  const [zones, setZones] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedSubArea, setSelectedSubArea] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);

  useEffect(() => {
    loadDeliveryData();
  }, []);

  async function loadDeliveryData() {
    try {
      const res = await client.get('/delivery/zones');
      if (res.success && res.data) {
        setZones(res.data.zones || []);
        setSlots(res.data.slots || []);

        // Restore saved selection or default to first area & sub-area
        const savedAreaId = localStorage.getItem('freshmart_area_id');
        const savedSubAreaId = localStorage.getItem('freshmart_sub_area_id');

        let matchedArea = null;
        let matchedSub = null;

        if (savedAreaId && res.data.zones.length > 0) {
          matchedArea = res.data.zones.find(z => z.id === Number(savedAreaId));
          if (matchedArea && savedSubAreaId) {
            matchedSub = matchedArea.sub_areas.find(s => s.id === Number(savedSubAreaId));
          }
        }

        if (!matchedArea && res.data.zones.length > 0) {
          matchedArea = res.data.zones[0];
          matchedSub = matchedArea.sub_areas?.[0] || null;
        }

        setSelectedArea(matchedArea);
        setSelectedSubArea(matchedSub);

        if (res.data.slots.length > 0) {
          setSelectedSlot(res.data.slots[0]);
        }
      }
    } catch (err) {
      console.warn('Failed to load delivery zones:', err.message);
    } finally {
      setLoading(false);
    }
  }

  function setZoneSelection(area, subArea) {
    setSelectedArea(area);
    setSelectedSubArea(subArea);
    if (area) localStorage.setItem('freshmart_area_id', area.id);
    if (subArea) localStorage.setItem('freshmart_sub_area_id', subArea.id);
    setEligibility(null);
    setIsZoneModalOpen(false);
  }

  async function validateDelivery(subtotal = 0) {
    if (!selectedArea || !selectedSubArea) return null;
    try {
      const res = await client.post('/delivery/validate', {
        areaId: selectedArea.id,
        subAreaId: selectedSubArea.id,
        subtotal,
      });
      if (res.success) {
        setEligibility(res.data);
        return res.data;
      }
    } catch (err) {
      setEligibility({ eligible: false, message: err.message });
      return null;
    }
  }

  /**
   * Geolocation support
   */
  async function detectLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => reject(err),
        { timeout: 10000 }
      );
    });
  }

  return (
    <DeliveryContext.Provider
      value={{
        zones,
        slots,
        selectedArea,
        selectedSubArea,
        selectedSlot,
        setSelectedSlot,
        eligibility,
        loading,
        isZoneModalOpen,
        setIsZoneModalOpen,
        setZoneSelection,
        validateDelivery,
        detectLocation,
      }}
    >
      {children}
    </DeliveryContext.Provider>
  );
}

export function useDelivery() {
  return useContext(DeliveryContext);
}

export default DeliveryContext;
