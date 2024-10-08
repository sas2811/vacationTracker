const VERSION = "v3";

//offline resource list
const APP_STATIC_RESOURCES = [
    "index.html",
    "style.css",
    "app.js",
    "vacationTracker.json",
    "assets/icons/icon-512X512.png"
];

const CACHE_NAME = `vacation-tracker-${VERSION}`;

// handle the install event and retrieve and store the files listed for the cache 
self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            cache.addAll(APP_STATIC_RESOURCES);
        })()
    );
});

//use the activate event to delete any old caches so we don't run out of space.
//We're going to delete all but the current one. Then set the service worker
// as the controller for out app (PWA). 

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            //get the names of existing caches
            const names = await caches.keys();

            //iterate through the list and check each one to see if 
            //it's the current cache and delete if not
            await Promise.all(
                names.map((name) => {
                    if (name !== CACHE_NAME){
                        return caches.delete(name);
                    }
                })
            );
            
            //use the claim () method of client's interface to enable our service worker as the controller
            await clients.claim();



        })()
    );
});

//use the fetch event to intercept requests to the server so we can 
//serve up our cached pages or respond with an error or 404
self.addEventListener("fetch", (event) => {
    event.respondWith((async () => {

        //try to get the resource from the cache
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse){
            return cachedResponse;
        }

        //if not in the cache, try to fetch from the network
        try {
            const networkResponse = await fetch(event.request);

            //cache the new response for future use
            cache.put(event.request, networkResponse.clone());

            return networkResponse;
        }
        catch (error){

            console.log("Fetch failed; returning our offline page instead. ", error);

            //if the request is for a page, return index.html as a fallback
            if (event.request.mode === "navigate") {
                return cache.match("/index.html");
            }

            //for everything else, we're just going to throw an error
            //you might want to return a default offline asset instead
            throw error;
        }


        })()
    ); //respond with
    
}); //fetch

// //send a message to the client - we will use to update the data later
// function sendMessageToPWA(message) {
//     self.clients.matchAll().then((clients) => {
//         clients.forEach((client) => {
//             client.postMessage(message);
//         });
//     });
// }

// //send a message every 10 seconds
// setInterval(() => {
//     sendMessageToPWA({type: "update", data: "New data available"});
// }, 10000);

// //listen for message from the app
// self.addEventListener('message', (event) => {
//     console.log("Service worker received a message", event.data);

//     //you can respond back if needed
//     event.source.postMessage({
//         type: "response",
//         data: "Message received by sw",
//     });
// });

//create a broadcast channeh - name here needs to match the name in the app
const channel = new BroadcastChannel("pwa_channel");

//listen for messages
channel.onmessage = (event) => {
    console.log("Received a message in Service Worker: ", event.data);

    //echo the message back to the PWA
    channel.postMessage("Service worker received: " + event.data);
};