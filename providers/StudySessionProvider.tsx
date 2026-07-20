"use client";
import { createContext, useContext, useState, ReactNode } from "react";

interface StudySessionContextType {
  isActiveSession: boolean;
  setIsActiveSession: (isActive: boolean) => void;
}

const StudySessionContext = createContext<StudySessionContextType | undefined>(undefined);

export function StudySessionProvider({ children }: { children: ReactNode }) {
  const [isActiveSession, setIsActiveSession] = useState(false);
  return (
    <StudySessionContext.Provider value={{ isActiveSession, setIsActiveSession }}>
      {children}
    </StudySessionContext.Provider>
  );
}

export function useStudySession() {
  const context = useContext(StudySessionContext);
  if (context === undefined) {
    throw new Error("useStudySession must be used within a StudySessionProvider");
  }
  return context;
}
