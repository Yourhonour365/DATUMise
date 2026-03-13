import { createContext, useContext, useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "datumise-filters";

const defaultFilters = {
  scope: "surveys",
  clients: [],
  sites: [],
  surveyors: [],
  statuses: [],
  schedule_types: [],
};

function loadFilters() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaultFilters, ...JSON.parse(stored) };
  } catch {}
  return defaultFilters;
}

const FilterContext = createContext();

export function FilterProvider({ children }) {
  const [filters, setFiltersState] = useState(loadFilters);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  const setFilters = useCallback((updates) => {
    setFiltersState((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, []);

  const hasActiveFilters = !!(
    filters.clients.length ||
    filters.sites.length ||
    filters.surveyors.length ||
    filters.statuses.length ||
    filters.schedule_types.length
  );

  return (
    <FilterContext.Provider value={{ filters, setFilters, clearFilters, hasActiveFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  return useContext(FilterContext);
}
