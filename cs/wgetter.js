let url = window.location.href;
let dormant = false;

chrome.runtime.sendMessage({action: 'store-url', payload: url}, undefined, (result) => {
    if (result) {
        console.log("The url has been stored, awaiting response from service worker.");
    }
});

