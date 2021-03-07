
const cacheVersion = 'v1';

self.addEventListener('install', event => {
  event.waitUntil(clients.get(event.clientId).then(client => {
    // if(client) {
    //   client.postMessage({ log: `sw installing...` });
    // }
    return caches.open(cacheVersion).then(cache => {
      // client.postMessage({ log: `sw opened the cache` });
      return cache.addAll([
        '/app/',
        '/app/application.css',
        '/app/application.js',
        '/app/awsClient.js',
        '/app/scryptWebWorker.js',
        '/app/vendor/sjcl.js',
        '/app/vendor/cryptoWordList.js',
      ]).catch(x => {
        if(console && console.log) {
          console.log("test", x);
        }
        // client.postMessage({ log: `sw installation failed; populating the cache failed` });
      });
    }).catch(x => {
      if(console && console.log) {
        console.log("test", x);
      }
      // client.postMessage({ log: `sw installation failed; opening the cache failed` });
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
        return fetch(event.request).then(async (response) =>  {
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
            

            if(client) {
              client.postMessage({ log: `cache miss: ${event.request.method}, ${event.request.url}` });
            }

            return await caches.open(cacheVersion).then((cache) => {
              return cache.put(event.request, responseClone).then(x => {
                return response;
              });
            });
          } else if(client) {
            client.postMessage({ log: `ignored: ${event.request.method}, ${event.request.url}` });
          }
  
          return response;
        }).catch( e => {
          if(client) {
            client.postMessage({ log: `fetch failed in serviceworker! ${event.request.method}, ${event.request.url}: ${e} ` });
          }
          return null;
        });
      }
    });
  }));
  
});