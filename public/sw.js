// Service worker mínimo: solo habilita que el navegador pueda "instalar" la app.
// Sin cache offline por ahora — todo pasa directo a la red.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
