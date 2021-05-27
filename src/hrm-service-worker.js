

self.addEventListener('fetch', function(event) {
    if(event.request.url && event.request.url.indexOf("/getImage64/")>=0){
        event.respondWith(
            caches.open('qvamarkets_hrm_v2').then(function(cache) {
                return cache.match(event.request).then(function (response) {
                return response || fetch(event.request).then(function(response) {
                    cache.put(event.request, response.clone());
                    return response;
                });
                });
            })
        );
    }
});