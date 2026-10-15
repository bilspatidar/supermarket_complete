
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import client from '../api/client';
import { STORE_DEFAULTS } from "../config/storeConfig";

const StoreSettingsContext = createContext(null);

function mergeSettings(apiSettings = {}) {
  const result = { ...STORE_DEFAULTS };

  Object.entries(apiSettings).forEach(([key, value]) => {
    if (
      value !== null &&
      value !== undefined &&
      value !== ""
    ) {
      result[key] = value;
    }
  });

  return result;
}

function extractSettings(response) {
  const payload = response?.data;

  // Supports { success: true, data: {...} }
  // and a direct settings object.
  if (payload?.success === true && payload.data) {
    return payload.data;
  }

  if (payload?.data && !Array.isArray(payload.data)) {
    return payload.data;
  }

  return payload || {};
}

const normalizeBoolean = (value) => {
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }

  return value === true || value === 1;
};

export function StoreSettingsProvider({ children }) {
  const [apiSettings, setApiSettings] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState(null);

  const loadSettings = async () => {
    try {
      const response = await client.get("/settings");
      const settings = extractSettings(response);

      setApiSettings(settings);
      setSettingsError(null);
    } catch (error) {
      setSettingsError(error);
      console.error("Settings API failed; using defaults.", error);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const storeSettings = useMemo(() => {
    const merged = mergeSettings(apiSettings);

    // Normalize API booleans because APIs may return
    // true/false, 1/0, or "true"/"false".
    [
      "cod_enabled",
      "razorpay_enabled",
      "membership_enabled",
      "welcome_bonus_enabled",
    ].forEach((key) => {
      merged[key] = normalizeBoolean(merged[key]);
    });

    return merged;
  }, [apiSettings]);

  const value = useMemo(
    () => ({
      storeSettings,
      settingsLoading,
      settingsError,
      refreshSettings: loadSettings,
    }),
    [storeSettings, settingsLoading, settingsError]
  );

  return (
    <StoreSettingsContext.Provider value={value}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  const context = useContext(StoreSettingsContext);

  if (!context) {
    throw new Error(
      "useStoreSettings must be used inside StoreSettingsProvider"
    );
  }

  return context;
}
