//create constants for the form and form controls
const newVacationFormElement = document.getElementsByTagName("form")[0];
const startDateInputElement = document.getElementById("start-date");
const endDateInputElement = document.getElementById("end-date");
const pastVacationContainer = document.getElementById('past-vacations');


//listen to form submissions
newVacationFormElement.addEventListener("submit", (event) => {
    //prevent form from submitting to the server
    //since we're going to do everything on the client side 
    event.preventDefault();
    
    //get the dates from the form
    const startDate = startDateInputElement.value;
    const endDate = endDateInputElement.value;

    //check if the dates are invalid
    if (checkDatesInvalid(startDate, endDate)){
        return; //don't "submit" the form, just exit
    }
    //store the new vacation in client side storage
    storeNewVacation(startDate, endDate);

    //refresh the UI
    renderPastVacations();

    //reset the form
    newVacationFormElement.reset();
});

function checkDatesInvalid(startDate, endDate){
    if (!startDate || !endDate || startDate > endDate) {
        //should do error message, etc here
        //we're just going to clear the form if anything's invalid
        newVacationFormElement.reset();

        return true; //something is invalid
    }

    else{
        return false; //everything is good
    }
}

//add the storage key as an app-wide constant bc we might be using it in multiple places
const STORAGE_KEY = "vaca_tracker";

function storeNewVacation(startDate, endDate){
    //get data from storage
    const vacations = getAllStoredVacations(); //returns an array of strings

    //add new vacation at the end of the array
    vacations.push({startDate, endDate});

    //sort array so newest -> oldest vacations
    //sort is a predefined function and it knows if there aren't any elements/if there's only one
    vacations.sort((a, b) => {
        return new Date(b.startDate) - new Date(a.startDate); //if negative it'll be false
    });

    //store the new array back in storage
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vacations));

} //storeNewVacation

function getAllStoredVacations(){
    //get the string of vacation from local storage
    const data = window.localStorage.getItem(STORAGE_KEY);

    //if no vacations are stored, default to an empty array
    //otherwise return the stored data (JSON string) as parsed JSON

    // using a turnary operator (if then else) and returns a val
    const vacations = data ? JSON.parse(data) : [];
    //                does data exist; ? then; parse the data; : else; empty string


    return vacations;

} //getAllStoredVacations

function renderPastVacations(){

    //get the parsed string of vacations or an empty array if there aren't any
    const vacations = getAllStoredVacations();

    //exit if there aren't any vacations
    if (vacations.length === 0) {
        return;
    }

    //clear the list of past vacations since we're going to rerender it
    pastVacationContainer.innerHTML = "";
    const pastVacationHeader = document.createElement("h2");
    pastVacationHeader.textContent = "Past Vacations";

    const pastVacationList = document.createElement("ul");

    //loop over all vacations and render them
    vacations.forEach((vacation) => {
        const vacationEl = document.createElement("li");
        vacationEl.textContent = `From ${formatDate(vacation.startDate)} 
        to ${formatDate(vacation.endDate)}`;
        pastVacationList.appendChild(vacationEl);
    });

    pastVacationContainer.appendChild(pastVacationHeader);
    pastVacationContainer.appendChild(pastVacationList);
} //renderPastVacations

function formatDate(dateString){
    //convert the string to a date object
    const date = new Date(dateString);

    //formate the date into a locale specific string
    //include your locale for better user experience
    return date.toLocaleDateString("en-US", {timeZone: "UTC"});

} //formatDate


//start the app by rendering the past vacations on load if any
renderPastVacations();


//register the sw
if ("serviceWork" in navigator){
    navigator.serviceWorker.register('sw.js')
    .then((registration) => {
        console.log("Service worker registered with scope: ", registration.scope);
    })
    .catch((error) => {
        console.log("Service worker registration failed: ", error);
    });
}

// //listen for messages from service worker
// navigator.serviceWorker.addEventListener("message", (event) => {
//     console.log("Received a message from the service worker: ", event.data);

//     //handle diff message types
//     if (event.data.type === "update"){
//         console.log("Update received: ", event.data.data);
//         // update ur UI or perform some action
//     }
// });

// //function to send a message to the service worker
// function sendMessageToSW(message) {
//     if (navigator.serviceWorker.controller){
//         navigator.serviceWorker.controller.postMessage(message);
//     }
// }

// document.getElementById('sendButton').addEventListener("click", () => {
//     sendMessageToSW({type: "action", data: "Button clicked"});
// });

//create a broadcast channeh - name here needs to match the name in the sw
const channel = new BroadcastChannel("pwa_channel");

//listen for messages
channel.onmessage = (event) => {
    console.log("Received a message in PWA: ", event.data);
    document.getElementById('messages').insertAdjacentHTML("beforeend", `<p>Received: ${event.data}</p>`);
};

//send a message when the button is clicked
document.getElementById('sendButton').addEventListener("click", () => {
    const message = "Hellow from PWA!";
    channel.postMessage(message);
    console.log("Sent message from PWA: ", message);
});


//open or create the database
let db;
const dbName = "SyncDatabase";
const request = indexedDB.open(dbName, 1);

request.onerror = function (event) {
    console.error("Database error: " + event.target.error);
};

request.onsuccess = function (event) {
    //now we have our db
    db = event.target.result;
    console.log("Database opened successfully");
};

request.onupgradeneeded = function (event) {
    db = event.target.result;

    //create any new object stores for our db or delete any old ones from a prev version
    const objectStore = db.createObjectStore( "pendingData", 
        {
            keyPath: "id",
            autoIncrement: true
        }
    );
};

//add data to our db, we need a transaction to accomplish it
function addDataToIndexDB(data){
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["pendingData"], "readWrite");
        const objectStore = transaction.objectStore("pendingData");
        const request = objectStore.add({data: data});

        request.onsuccess = function(event) {
            resolve();
        };
        request.onerror = function(event) {
            reject("Error storing data: " + event.target.error);
        };
    }); //promise
}

//handle form submissions
document.getElementById("dataForm")
    .addEventListener("submit", function(event){
        event.preventDefault(); //don't send to server now (want ot make it work offline)

        //get our data
        const data = document.getElementById("dataInput").value;

        //wwe need to check to see if both the serviceWorker and the SyncManager are available
        if ("serviceWorker" in navigator && "SyncManager" in window){
            //we're good, add the data to the db for offline persistence
            addDataToIndexDB(data)
                .then(() => navigator.serviceWorker.ready) //wait for the sw to be ready
                .then((registration) => {
                    //registers  a sync event for when the device comes online
                    return registration.sync.register("send-data");
                })
                .then(() => {
                    //update the UI for successful registration
                    document.getElementById("status").textContent = "Sync registered. Data will be sent when online.";
                })
                .catch((error) => {
                    console.error("Error: ", error);
                });
            
        } else {
            // background sync not supported, try to send immediately 
            sendData(data)
                .then((result) => {
                    //update UI
                    document.getElementById("status").textContent = result;
                })
                .catch((error) => {
                    //update UI
                    document.getElementById("status").textContent = error.message;
                })
        }
    }); //event listener 

    //simulate sending data
    function sendData(data){
        console.log("Attempting to send data: ", data);

        return new Promise((resolve, reject) => {
            setTimeout(() =>{
                if (Math.random() > 0.5) {
                    resolve("data sent successfully");
                } else {
                    reject (new Error("Failed to send data"));
                }
            }, 1000);
        });
    }

