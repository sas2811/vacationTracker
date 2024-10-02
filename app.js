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