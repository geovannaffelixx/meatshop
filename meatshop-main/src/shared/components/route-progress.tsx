"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LoadingOverlay } from "@/shared/components/loading-overlay";

const MINIMUM_VISIBLE_MS = 1000;
const NAVIGATION_TIMEOUT_MS = 15000;

function isInternalNavigationClick(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  const anchor = (event.target as HTMLElement | null)?.closest("a");
  if (!anchor) return false;

  const href = anchor.getAttribute("href");
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return false;
  }
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) return false;

  // Mudanças apenas na query não trocam a página observada por usePathname.
  return url.pathname !== window.location.pathname;
}

/** Feedback visual durante trocas de página dentro do painel. */
export function RouteProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const startedAt = useRef<number | null>(null);
  const previousPathname = useRef(pathname);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function finishNavigation() {
    setVisible(false);
    setWidth(0);
    startedAt.current = null;
  }

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!isInternalNavigationClick(event)) return;

      clearTimers();
      startedAt.current = performance.now();
      setVisible(true);
      setWidth(25);

      timers.current.push(setTimeout(() => setWidth(65), 150));
      timers.current.push(setTimeout(() => setWidth(85), 600));
      timers.current.push(
        setTimeout(finishNavigation, NAVIGATION_TIMEOUT_MS),
      );
    }

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      clearTimers();
    };
  }, []);

  useEffect(() => {
    const routeChanged = previousPathname.current !== pathname;
    previousPathname.current = pathname;
    if (!routeChanged || startedAt.current === null) return;

    clearTimers();
    setWidth(100);

    const elapsed = performance.now() - startedAt.current;
    const remaining = Math.max(MINIMUM_VISIBLE_MS - elapsed, 150);
    timers.current.push(setTimeout(finishNavigation, remaining));
  }, [pathname]);

  return (
    <>
      {visible && <LoadingOverlay title="Carregando página..." />}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[101] h-[3px] bg-[#BE2C1B] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${width}%`, opacity: visible ? 1 : 0 }}
      />
    </>
  );
}
