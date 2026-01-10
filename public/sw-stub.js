/* 
  CPA Tracker PWA Service Worker Stub
  This file is currently inactive. 
  Caching and offline logic will be implemented in future phases.
*/

self.addEventListener("install", (event) => {
  console.log("SW installed");
});

self.addEventListener("activate", (event) => {
  console.log("SW activated");
});

self.addEventListener("fetch", (event) => {
  // Pass-through for now
  return;
});
