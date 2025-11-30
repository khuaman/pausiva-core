"use client";

import { createContext, useContext, useCallback, useRef } from 'react';

type RefetchFunction = () => void | Promise<void>;

interface DataRefetchContextType {
  registerPatientsRefetch: (refetch: RefetchFunction) => void;
  registerDoctorsRefetch: (refetch: RefetchFunction) => void;
  triggerPatientsRefetch: () => Promise<void>;
  triggerDoctorsRefetch: () => Promise<void>;
}

const DataRefetchContext = createContext<DataRefetchContextType | undefined>(undefined);

export function DataRefetchProvider({ children }: { children: React.ReactNode }) {
  const patientsRefetchRef = useRef<RefetchFunction[]>([]);
  const doctorsRefetchRef = useRef<RefetchFunction[]>([]);

  const registerPatientsRefetch = useCallback((refetch: RefetchFunction) => {
    if (!patientsRefetchRef.current.includes(refetch)) {
      patientsRefetchRef.current.push(refetch);
    }
  }, []);

  const registerDoctorsRefetch = useCallback((refetch: RefetchFunction) => {
    if (!doctorsRefetchRef.current.includes(refetch)) {
      doctorsRefetchRef.current.push(refetch);
    }
  }, []);

  const triggerPatientsRefetch = useCallback(async () => {
    await Promise.all(patientsRefetchRef.current.map((refetch) => refetch()));
  }, []);

  const triggerDoctorsRefetch = useCallback(async () => {
    await Promise.all(doctorsRefetchRef.current.map((refetch) => refetch()));
  }, []);

  return (
    <DataRefetchContext.Provider
      value={{
        registerPatientsRefetch,
        registerDoctorsRefetch,
        triggerPatientsRefetch,
        triggerDoctorsRefetch,
      }}
    >
      {children}
    </DataRefetchContext.Provider>
  );
}

export function useDataRefetch() {
  const context = useContext(DataRefetchContext);
  if (!context) {
    throw new Error('useDataRefetch must be used within a DataRefetchProvider');
  }
  return context;
}

