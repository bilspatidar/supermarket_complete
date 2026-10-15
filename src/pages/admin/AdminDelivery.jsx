import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Plus,
  Clock,
  Truck,
  ShieldCheck,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import client from '../../api/client.js';

export default function AdminDelivery() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Area Modal
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [areaName, setAreaName] = useState('');
  const [areaFee, setAreaFee] = useState('40');
  const [areaFreeMin, setAreaFreeMin] = useState('499');
  const [areaMinOrder, setAreaMinOrder] = useState('199');
  const [areaStart, setAreaStart] = useState('08:00');
  const [areaEnd, setAreaEnd] = useState('22:00');

  // New Sub-Area Modal
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [targetAreaId, setTargetAreaId] = useState('');
  const [subName, setSubName] = useState('');
  const [subFee, setSubFee] = useState('');
  const [subFreeMin, setSubFreeMin] = useState('');



  // Edit Area
const [editingArea, setEditingArea] = useState(null);

// Edit Sub-Area
const [editingSubArea, setEditingSubArea] = useState(null);

  useEffect(() => {
    loadZones();
  }, []);

  async function loadZones() {
    setLoading(true);
    try {
      const res = await client.get('/delivery/zones');
      if (res.success && res.data) {
        setZones(res.data.zones || []);
        if (res.data.zones?.length > 0 && !targetAreaId) {
          setTargetAreaId(res.data.zones[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to load zones:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateArea(e) {
    e.preventDefault();
    try {
      await client.post('/delivery/areas', {
        name: areaName,
        delivery_charge: Number(areaFee),
        free_delivery_minimum: Number(areaFreeMin),
        minimum_order: Number(areaMinOrder),
        start_time: areaStart,
        end_time: areaEnd,
      });
      setIsAreaModalOpen(false);
      setAreaName('');
      loadZones();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleUpdateArea(e) {
  e.preventDefault();

  if (!editingArea) return;

  try {
    await client.put(`/delivery/areas/${editingArea.id}`, {
      name: areaName,
      delivery_charge: Number(areaFee),
      free_delivery_minimum: Number(areaFreeMin),
      minimum_order: Number(areaMinOrder),
      start_time: areaStart,
      end_time: areaEnd,
    });

    setEditingArea(null);
    setIsAreaModalOpen(false);

    setAreaName('');
    setAreaFee('40');
    setAreaFreeMin('499');
    setAreaMinOrder('199');
    setAreaStart('08:00');
    setAreaEnd('22:00');

    await loadZones();
  } catch (err) {
    alert(err.message);
  }
}

  async function handleCreateSubArea(e) {
    e.preventDefault();
    try {
      await client.post('/delivery/sub-areas', {
        area_id: Number(targetAreaId),
        name: subName,
        delivery_charge: subFee ? Number(subFee) : null,
        free_delivery_minimum: subFreeMin ? Number(subFreeMin) : null,
      });
      setIsSubModalOpen(false);
      setSubName('');
      setSubFee('');
      setSubFreeMin('');
      loadZones();
    } catch (err) {
      alert(err.message);
    }
  }


  async function handleUpdateSubArea(e) {
  e.preventDefault();

  if (!editingSubArea) return;

  try {
    await client.put(`/delivery/sub-areas/${editingSubArea.id}`, {
      area_id: Number(targetAreaId),
      name: subName,
      delivery_charge: subFee ? Number(subFee) : null,
      free_delivery_minimum: subFreeMin
        ? Number(subFreeMin)
        : null,
    });

    setEditingSubArea(null);
    setIsSubModalOpen(false);

    setSubName('');
    setSubFee('');
    setSubFreeMin('');

    await loadZones();
  } catch (err) {
    alert(err.message);
  }
}

async function handleDeleteArea(area) {
  const confirmed = window.confirm(
    `Delete "${area.name}"?\n\nThis may also delete its sub-areas.`
  );

  if (!confirmed) return;

  try {
    await client.delete(`/delivery/areas/${area.id}`);

    await loadZones();
  } catch (err) {
    alert(err.message);
  }
}

async function handleDeleteSubArea(sub) {
  const confirmed = window.confirm(
    `Delete sub-area "${sub.name}"?`
  );

  if (!confirmed) return;

  try {
    await client.delete(`/delivery/sub-areas/${sub.id}`);

    await loadZones();
  } catch (err) {
    alert(err.message);
  }
}
function openEditArea(area) {
  setEditingArea(area);

  setAreaName(area.name || '');
  setAreaFee(String(area.delivery_charge ?? ''));
  setAreaFreeMin(String(area.free_delivery_minimum ?? ''));
  setAreaMinOrder(String(area.minimum_order ?? ''));
  setAreaStart(area.start_time || '08:00');
  setAreaEnd(area.end_time || '22:00');

  setIsAreaModalOpen(true);
}


function openEditSubArea(sub, areaId) {
  setEditingSubArea(sub);

  setTargetAreaId(String(areaId));
  setSubName(sub.name || '');

  setSubFee(
    sub.delivery_charge !== null &&
    sub.delivery_charge !== undefined
      ? String(sub.delivery_charge)
      : ''
  );

  setSubFreeMin(
    sub.free_delivery_minimum !== null &&
    sub.free_delivery_minimum !== undefined
      ? String(sub.free_delivery_minimum)
      : ''
  );

  setIsSubModalOpen(true);
}


  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Delivery Zones &amp; Hierarchy</h1>
          <p className="text-xs text-slate-500">
            Hierarchy: Area → Sub-Area. Sub-areas inherit Area settings unless overridden.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAreaModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Area (City)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsSubModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Sub-Area</span>
          </button>
        </div>
      </div>

      {/* Zones listing */}
      <div className="space-y-6">
        {zones.map((area) => (
          <div key={area.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            
            {/* Area Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">{area.name}</h3>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">
                  Parent Area
                </span>
              </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
  <span>
    Default Fee: <strong>₹{area.delivery_charge}</strong>
  </span>

  <span>
    Free Above:
    <strong className="text-emerald-700">
      ₹{area.free_delivery_minimum}
    </strong>
  </span>

  <span className="flex items-center gap-1">
    <Clock className="w-3.5 h-3.5 text-slate-400" />
    <span>
      {area.start_time} - {area.end_time}
    </span>
  </span>

  <div className="flex items-center gap-1 ml-auto">
    <button
      type="button"
      onClick={() => openEditArea(area)}
      className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 cursor-pointer"
      title="Edit Area"
    >
      <Pencil className="w-3.5 h-3.5" />
    </button>

    <button
      type="button"
      onClick={() => handleDeleteArea(area)}
      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
      title="Delete Area"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>
</div>
            </div>

            {/* Sub-areas list */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Sub-Areas ({area.sub_areas?.length || 0})
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {(area.sub_areas || []).map((sub) => {
                  const hasOverride = sub.delivery_charge !== null;
                  return (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 space-y-1.5"
                    >
                     <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {sub.name}
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditSubArea(sub, area.id)}
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                          title="Edit Sub-Area"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSubArea(sub)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete Sub-Area"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                      <div className="text-[11px] text-slate-600 flex justify-between">
                        <span>Charge: <strong>₹{sub.effective_delivery_charge}</strong></span>
                        <span>Free min: <strong>₹{sub.effective_free_minimum}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Create Area Modal */}
      {isAreaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-black text-slate-900">
              {editingArea ? 'Edit Delivery Area' : 'Add Delivery Area'}
            </h3>
            <form
                onSubmit={editingArea ? handleUpdateArea : handleCreateArea}
                className="space-y-3"
              >
              <div>
                <label className="font-bold text-slate-700 block mb-1">Area / City Name</label>
                <input
                  type="text"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  placeholder="e.g. Jabalpur"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Standard Fee (₹)</label>
                  <input
                    type="number"
                    value={areaFee}
                    onChange={(e) => setAreaFee(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Free Delivery Min (₹)</label>
                  <input
                    type="number"
                    value={areaFreeMin}
                    onChange={(e) => setAreaFreeMin(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Start Time (HH:MM)</label>
                  <input
                    type="time"
                    value={areaStart}
                    onChange={(e) => setAreaStart(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">End Time (HH:MM)</label>
                  <input
                    type="time"
                    value={areaEnd}
                    onChange={(e) => setAreaEnd(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAreaModalOpen(false);
                    setEditingArea(null);
                  }}
                  className="px-4 py-2 border rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold cursor-pointer"
                >
                  {editingArea ? 'Update Area' : 'Save Area'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Sub-Area Modal */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-black text-slate-900">
              {editingSubArea
                ? 'Edit Delivery Sub-Area'
                : 'Add Delivery Sub-Area'}
            </h3>
           <form
              onSubmit={
                editingSubArea
                  ? handleUpdateSubArea
                  : handleCreateSubArea
              }
              className="space-y-3"
            >
              <div>
                <label className="font-bold text-slate-700 block mb-1">Parent Area</label>
                <select
                  value={targetAreaId}
                  onChange={(e) => setTargetAreaId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Sub-Area / Neighborhood Name</label>
                <input
                  type="text"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="e.g. Wright Town"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Override Fee (Leave blank to inherit)</label>
                  <input
                    type="number"
                    value={subFee}
                    onChange={(e) => setSubFee(e.target.value)}
                    placeholder="Inherit parent"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Override Free Min</label>
                  <input
                    type="number"
                    value={subFreeMin}
                    onChange={(e) => setSubFreeMin(e.target.value)}
                    placeholder="Inherit parent"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsSubModalOpen(false);
                  setEditingSubArea(null);
                }}
                className="px-4 py-2 border rounded-xl cursor-pointer"
              >
                Cancel
              </button>
                            <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold cursor-pointer"
              >
                {editingSubArea
                  ? 'Update Sub-Area'
                  : 'Save Sub-Area'}
              </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
