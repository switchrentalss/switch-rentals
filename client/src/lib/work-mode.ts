import { useEffect, useState } from "react";

export type WorkMode = "floor" | "owner";

const KEY = "switch-work-mode";

export function getWorkMode(): WorkMode {
  if (typeof window === "undefined") return "floor";
  return window.localStorage.getItem(KEY) === "owner" ? "owner" : "floor";
}

export function useWorkMode() {
  const [mode, setModeState] = useState<WorkMode>("floor");
  useEffect(() => {
    setModeState(getWorkMode());
    const onChange = () => setModeState(getWorkMode());
    window.addEventListener("switch-work-mode", onChange);
    return () => window.removeEventListener("switch-work-mode", onChange);
  }, []);
  const setMode = (next: WorkMode) => {
    window.localStorage.setItem(KEY, next);
    window.dispatchEvent(new Event("switch-work-mode"));
    setModeState(next);
  };
  return { mode, setMode };
}
