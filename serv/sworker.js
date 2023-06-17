foreign_hrefs = []
let core = {
    pk: null,
    joblists: [],
    host: 'http://127.0.0.1:8000/'
}

// helper functions
async function post(url, data) {
    return fetch(url, {
        "method": "POST",
        "headers": {
            "Content-Type": "application/json",
        },
        "body": JSON.stringify(data),
    });
}

// we register a consumer 
register();

// we need to query the server that we have loaded a new page
// and that we need the page's foreign hrefs...
chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message.action == "store-url") {
        // we are asked to store a url for ingestion into the 
        // sandbox.

        console.log(`We have been asked to store: ${message.payload}`);
        let data = {
            location: message.payload,
        }
        let response = post(`${core.host}${core.pk}/job`, data);
        
        // as a response we expect the foreign urls that we are going to allow
        // to be rendered.
        response.then((raw) => {return raw.json()})
        .then((package) => {
            package.hrefs.forEach((href) => {
                foreign_hrefs.push(href);
            });

            console.log(`We added the following links: ${package.hrefs}`);
        });


        reply(true);
    } else {
        console.log(`We have received this message: ${message}`);
        reply(false);
    }

    return true;
});


function extract_before_request(details) {
    // we extract all we can from this event and add it to the
    // object for later serialization. We will harvest most of 
    // the informtion from this event.
    if (JSON.stringify(details).includes(CHROME_EXTENSION_PREFIX)) {
        return;
    }
    
    if (!foreign_hrefs.includes(details.url)) {
        // we alert the user that something fishy is going on...
    }
}

chrome.webRequest.onBeforeRequest.addListener(extract_before_request, {urls: ["<all_urls>"]}, ["requestBody"]);
