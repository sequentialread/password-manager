
const cacheVersion = 'v1';

self.addEventListener('install', event => {

  event.waitUntil(clients.get(event.clientId).then(client => {

    return caches.open(cacheVersion).then(cache => {
      return cache.addAll([
        '/',
        '/error',
        '/static/application.css',
        '/static/application.js',
        '/static/awsClient.js',
        '/static/scryptWebWorker.js',
        '/static/vendor/sjcl.js',
        '/static/vendor/cryptoWordList.js',
      ]);
    })
  }));
});

self.addEventListener('message', async event => {

  if(event.source) {
    event.source.postMessage({ log: `sw got message: ${JSON.stringify(event.data)}` });
  } else if(event.clientId) {
    const client = await clients.get(event.clientId);
    client.postMessage({ log: `sw got message: ${JSON.stringify(event.data)}` });
  }

  if(event.data.clearCache) {
    caches.delete(cacheVersion);
  }
});

self.addEventListener('fetch', event => {

  event.respondWith(clients.get(event.clientId).then((client) => {
    return caches.match(event.request).then(response => {
      // caches.match() always resolves
      // but in case of success response will have value
      if (response !== undefined) {
  
        
        if(client) {
          client.postMessage({ log: `cache hit: ${event.request.method}, ${event.request.url}` });
        }
        return response;
      } else {
        return fetch(event.request).then(response => {
          const url = new URL(event.request.url);
          const isServerStorage = url.pathname.startsWith('/storage');
          const isVersion = url.pathname == "/version";
          const isBackblaze = url.host.includes('backblazeb2.com');
          const isPut = event.request.method == "PUT";

          if(!isServerStorage && !isVersion && !isBackblaze && !isPut) {
            // response may be used only once
            // we need to save clone to put one copy in cache
            // and serve second one
            let responseClone = response.clone();
            
            caches.open(cacheVersion).then((cache) => {
              cache.put(event.request, responseClone);
            });
            if(client) {
              client.postMessage({ log: `cache miss: ${event.request.method}, ${event.request.url}` });
            }
          } else if(client) {
            client.postMessage({ log: `ignored: ${event.request.method}, ${event.request.url}` });
          }
  
          return response;
        }).catch( e => {
          if(client) {
            client.postMessage({ log: `fetch failed in serviceworker! ${event.request.method}, ${event.request.url}: ${e} ` });
          }
          return caches.match('/error');
        });
      }
    });
  }));
  
});