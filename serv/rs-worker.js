let sandbox_waiting = []
let sandbox_inprog = []
let sandbox_completed = []

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

// register this endpoint as a consumer
async function register() {
    // contact the server
    let response = post(`${core.host}register/consumer`, {});

    // get our consumer pk
    response.then((raw) => {return raw.json()})
        .then((data) => {
            console.log(`We received this pk: ${data['pk']}!`);
            core.pk = data['pk'];
        });
    
    
    console.log("Finished the registration process.");
}

register();

chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message.action == "store-url") {
        // we are asked to store a url for ingestion into the 
        // sandbox.

        console.log(`We have been asked to store: ${message.payload}`);
        sandbox_waiting.push(message.payload);

        reply(true);
    } else {
        console.log(`We have received this message: ${message}`);
        reply(false);
    }

    return true;
});

let state_check_intv = setInterval(async (handler) => {
    if (core.pk === null) {
        // remains dormant until we get a pk assigned
        return false;
    }

    // we have a pk, so we can begin job submition
    for (let jobreq of sandbox_waiting) {
        console.log(`Requesting that ${jobreq} be scanned!`);
        let response = post(`${core.host}${core.pk}/request`, {
            "url": jobreq,
        });

        response.then((raw) => {return raw.json()})
        .then((data) => {
            sandbox_inprog.push(data['jobpk']);
            console.log(`\tThe job has been registered as: ${data['jobpk']}.`);
        });
    }

    sandbox_waiting = [];
}, 2000)

