const CACHE = "countdown-static-v3";
const STATIC_ASSETS = ["/offline.html", "/icon-192.png", "/icon-512.png"];
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("countdown-") && name !== CACHE)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);

const cacheFirstStatic = async (request) => {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
};

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    // Documents must always prefer a fresh network response.
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).catch(() =>
        caches.match("/offline.html"),
      ),
    );
    return;
  }

  // Never cache API/auth responses, the manifest, or sw.js. They must remain
  // fresh and may contain deployment- or account-specific state.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/sw.js"
  )
    return;

  // Next.js emits content-hashed, immutable files here. Cache-first is safe
  // because a new deployment references new URLs from its fresh document.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirstStatic(event.request));
  }
});

const fallbackNotification = {
  title: "COUNT//DOWN",
  body: "You have a countdown notification.",
  url: "/",
};

const safeAppPath = (value) => {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  try {
    const url = new URL(value, self.location.origin);
    if (url.origin !== self.location.origin) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
};

self.addEventListener("push", (event) => {
  let payload = fallbackNotification;
  try {
    const value = event.data?.json();
    if (value && typeof value === "object") {
      payload = {
        title:
          typeof value.title === "string" && value.title
            ? value.title
            : fallbackNotification.title,
        body:
          typeof value.body === "string" && value.body
            ? value.body
            : fallbackNotification.body,
        url: safeAppPath(value.url),
      };
    }
  } catch {
    // Use a safe fallback when the push has no JSON payload.
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: safeAppPath(payload.url) },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = safeAppPath(event.notification.data?.url);
  const target = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windows) => {
        const exact = windows.find((client) => client.url === target);
        if (exact) return exact.focus();
        const existing = windows.find(
          (client) => new URL(client.url).origin === self.location.origin,
        );
        if (existing) {
          if ("navigate" in existing) await existing.navigate(target);
          return existing.focus();
        }
        return self.clients.openWindow(target);
      }),
  );
});
