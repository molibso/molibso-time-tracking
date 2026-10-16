"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PageSkeleton } from "./page-skeleton";

type NavigationContextValue = {
  pendingPath: string | null;
  beginNavigation: (href: string) => void;
};

const NavigationContext = createContext<NavigationContextValue>({
  pendingPath: null,
  beginNavigation: () => {},
});

export function isNavActive(href: string, path: string) {
  return path === href || path.startsWith(`${href}/`);
}

export function useCurrentPath() {
  const pathname = usePathname();
  const { pendingPath } = useContext(NavigationContext);
  return pendingPath ?? pathname;
}

export function useBeginNavigation() {
  return useContext(NavigationContext).beginNavigation;
}

function pathFromHref(href: string) {
  const path = href.split(/[?#]/)[0];
  return path.startsWith("/") ? path : null;
}

export function NavigationPending({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [seenPathname, setSeenPathname] = useState(pathname);
  const [showSkeleton, setShowSkeleton] = useState(false);

  if (pathname !== seenPathname) {
    setSeenPathname(pathname);
    setPendingPath(null);
  }

  const beginNavigation = useCallback(
    (href: string) => {
      const path = pathFromHref(href);
      if (!path || path === pathname) return;
      setPendingPath(path);
    },
    [pathname],
  );

  useEffect(() => {
    if (!pendingPath) {
      setShowSkeleton(false);
      return;
    }
    const reveal = window.setTimeout(() => setShowSkeleton(true), 80);
    const giveUp = window.setTimeout(() => setPendingPath(null), 20000);
    return () => {
      window.clearTimeout(reveal);
      window.clearTimeout(giveUp);
    };
  }, [pendingPath]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      beginNavigation(url.pathname);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [beginNavigation]);

  return (
    <NavigationContext.Provider value={{ pendingPath, beginNavigation }}>
      {pendingPath && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-0.5 bg-primary/25">
          <div className="h-full w-1/3 animate-pulse bg-primary" />
        </div>
      )}
      <PendingSkeletonContext.Provider value={showSkeleton && pendingPath !== null}>{children}</PendingSkeletonContext.Provider>
    </NavigationContext.Provider>
  );
}

const PendingSkeletonContext = createContext(false);

export function PendingOutlet({ children }: { children: React.ReactNode }) {
  const showSkeleton = useContext(PendingSkeletonContext);
  if (showSkeleton) return <PageSkeleton />;
  return children;
}
