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

//-----------create a broadcast channel - name here needs to match the name in the app
const channel = new BroadcastChannel("pwa_channel");

//listen for messages
channel.onmessage = (event) => {
    console.log("Received a message in Service Worker: ", event.data);

    //echo the message back to the PWA
    channel.postMessage("Service worker received: " + event.data);
};

//----------------open or create the database----------------
let db;
const dbName = "SyncDatabase";
const request = indexedDB.open(dbName, 1); //name and version needs to match app.js

request.onerror = function (event) {
    console.error("Database error: " + event.target.error);
};

request.onsuccess = function (event) {
    //now we have our db
    db = event.target.result;
    console.log("Database opened successfully in service worker");
};

self.addEventListener("sync", function (event) {
    if (event.tag === "send-data") {
        event.waitUntil(sendDataToServer());
    }
});

function sendDataToServer(){
    return getAllPendingData()
        .then(function(dataList){
            return Promise.all(
                dataList.map(function(item){

                    //simulate sending the data to the server

                    return new Promise((resolve, reject) => { 
                        setTimeout(() =>{
                            if (Math.random() > 0.1) { //90% success rate
                                console.log("data sent successfully: ", item.data);
                                resolve(item.id);
                            } 
                            else {
                                console.log("Failed to send data: ", item.data);
                                reject (new Error("Failed to send data"));
                            }
                        }, 1000); //set timeout
                    }) //return new PromiseRejectionEvent

                    .then(function(){
                        //if successful, remove item from database
                        return removeDataFromIndexedDB(item.id);
                    }); //.then(function())

                }) //map
            ) //return promise.all
        }) //.then function(dataList)

} //sendDataToServer

function getAllPendingData(){
    return new Promise((resolve, reject) => {
        //transaction to read data from db
        const transaction = db.transaction(['pendingData'], "readonly");
        const objectStore = transaction.objectStore("pendingData");
        const request = objectStore.getAll();

        request.onsuccess = function(event) {
            resolve(event.target.result); //send back data in db (will be dataList in sendDataToServer)
        };

        request.onerror = function(event) {
            reject("Error fetching data: " + event.target.error); //send back error
        }

    }); // return promise
} //get all pending data
