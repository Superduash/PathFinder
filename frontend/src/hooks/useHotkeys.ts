import { useEffect } from "react";

interface HotkeyConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  handler: () => void;
}

export function useHotkeys(configs: HotkeyConfig[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore hotkeys when typing in input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      for (const config of configs) {
        const matchesKey = e.key.toLowerCase() === config.key.toLowerCase();
        const matchesCtrl = config.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const matchesShift = config.shift ? e.shiftKey : true;

        if (matchesKey && matchesCtrl && matchesShift) {
          e.preventDefault();
          config.handler();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [configs]);
}

