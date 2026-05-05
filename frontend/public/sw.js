self.addEventListener("install", () => {
  console.log("Service Worker: Installed");
});

self.addEventListener("activate", () => {
  console.log("Service Worker: Activated");
});

self.addEventListener("fetch", (event) => {
  // Pass through all requests
  event.respondWith(fetch(event.request));
});
