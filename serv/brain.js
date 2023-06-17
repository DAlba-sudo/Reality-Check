///** Global Variables used for STATE */
let core = {
    // this points to the location of the server
    // set this to localhost for testing purposes.
    hostname: "http://127.0.0.1:8000",

    // the consumer primary key, used to access the pool of jobs that
    // this consumer has requested from the RS servers.
    cpk: null,
};

let foreign_hrefs = [];

/** Internal Queues */
let in_progress_jobs = [];
let finished_jobs = [];

/** Network Request Monitoring */
function extract_before_request(details) {
    // we extract all we can from this event and add it to the
    // object for later serialization. We will harvest most of 
    // the informtion from this event.
    if (JSON.stringify(details).includes(CHROME_EXTENSION_PREFIX)) {
        return;
    }
    
    if (!foreign_hrefs.includes(details.url)) {
        // we alert the user that something fishy is going on...
        alert("Something fishy is going on...");
    }
}

/** Helper Functions */
/**
 * Helper func to post data to a server without having to specify
 * the headers each time.
 * @param {String} url The url that we are posting to.
 * @param {JSON} data Data being sent in the request body.
 * @returns A js promise.
 */
async function post(url, data) {
    return fetch(url, {
        "method": "POST",
        "headers": {
            "Content-Type": "application/json",
        },
        "body": JSON.stringify(data),
    });
}

/** Functions Required for Interfacing with the RS Servers */
/**
 * Registers the extension as a consumer on the RS server.
 * @returns True if we were able to acquire a cpk from the server, false otherwise.
 */
async function register() {
    let result = post(`${core.hostname}/register`, {});
    let register_flag = await result
        .then((raw) => {return raw.json()})
        .then((data) => {
            let cpk = data['pk'];

            if (cpk == undefined || cpk == null) {
                return false;
            }

            core.cpk = cpk;                
        });

    return register_flag;
}

/**
 * Adds a job to the server's job queue, and stores the jobpk locally for
 * future checkins.
 * @returns The job's primary key (as told to us by the server).
 */
async function upload_job(hostname) {
    let rq = {
        uuid: core.cpk,
        url: hostname
    }

    let response = await post(`${core.hostname}/job/request`, rq)
        .then((raw) => {return raw.json()})
        .then((data) => {
            return data['jpk'];
        });
    
    console.log(`Was given this jpk: ${response}.`);
    return response;
}

/**
 * We use this to check on the status of a job. We will fire this until we hear back from the web
 * server that our job has been finished. 
 * @param {BigInteger} jobpk The primary key for the job that we want to check.
 */
async function spawn_job_check(jobpk) {
    console.log(`\tStarted a Job Check Timeout for (${jobpk}).`);
    let response = post(`${core.hostname}/job/${jobpk}`);
    response
        .then((raw) => {return raw.json()})
        .then((serialized_list) => {
            return serialized_list[0];
        })
        .then((data) => {
            console.log(`Received this serialized object: ${JSON.stringify(data)}`)
            if (!data['has_completed']) {
                // we spin up another async timeout to check later
                setTimeout(() => {
                    spawn_job_check(jobpk);
                }, 500);
            } else {

                // the status is something other than complete
                // so we parse for the links.
                for (let foreign_link of data['flinks']) {
                    foreign_hrefs.push(foreign_link);
                }
                
            }
        });

    return true;
    
}

/**
 * The driver function for the entire reality-check backend.
 */
async function main() {
    // we begin by registering this extension as a consumer.
    let registration_status = await register();
    console.log(registration_status);

    console.log(`Registered under the cpk: ${core.cpk}.`);

    // now we have the cpk, we add the appropriate listeners
    chrome.runtime.onMessage.addListener(async (message, sender, reply) => {
        if (message.action == "init-url") {
           let jobpk = await upload_job(message.hostname);
            spawn_job_check(jobpk);
        }
    });
    
    chrome.webRequest.onBeforeRequest.addListener(extract_before_request, {urls: ["<all_urls>"]}, ["requestBody"]);
    return true;
}

main();