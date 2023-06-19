// this is going to be the production file for the 
// reality-check extension.

import { data_post, core, extract_domain } from './helper.js'

/** Globals */
let job_queue = []
let expected_request_domains = []

/**
 * This function will register the extension instance as a consumer
 * with the server.
 * 
 * @returns a consumer token that is used to validate posting
 */
async function register_consumer(email) {
    let request_data = {
        consumer_token: "None",
        consumer_email: email,
    };

    let response_data = data_post(`${core.hostname}/consumer/register`, request_data);
    let ctoken = response_data
        .then((raw) => {return raw.json()})
        .then((data) => {
            return data.token;
        });

    return ctoken;
}

/**
 * Registers a job with the server, returning the jobpk for future check-ins.
 * @param {String} url the url that we want scanned for us
 * @returns the primary key for the job we just submitted
 */
async function register_job(url) {
    let request_data = {
        consumer_token: core.consumer_token,
        job_target_url: url,
    }

    let response_data = data_post(`${core.hostname}/job/register`, request_data);
    let jobpk = response_data
        .then((raw) => {return raw.json()})
        .then((data) => {
            return data['jobpk'];
        });
    
    return jobpk;
}

async function job_check(jobpk) {
    // we reach out to the server and expect to receive
    // data (or an indication that our information has been parsed).
    let request_data = {
        consumer_token: core.consumer_token, 
    }
    let response = data_post(`${core.hostname}/job/${jobpk}`, request_data);
    let data = await response.then((raw) => {
        return raw.json();
    });

    if (data['state'] != 'DN') {
        setTimeout(job_check(jobpk), 1400);
    } else {
        console.log(`Job has completed: ${JSON.stringify(data)}`)
        for (let domain in data['result']) {
            expected_request_domains.push(domain);
        }

        core.suppress_alerts = false;
    }

    return true;
}

function job_check_spawner() {
    if (job_queue.length <= 0) {

    } else {
        for (let jobpk of job_queue) {
            job_check(jobpk);
        }

        job_queue = [];
    }
}

chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message.action == "data-email") {
        console.log("We are registering with the server...");
        register_consumer(message.email).then((token) => {
            core.consumer_token = token;
            reply(token);
        });
    } 
    
    if (message.action == "init-url" && core.consumer_token != null) {
        console.log("Registering job: " + message.hostname);
        expected_request_domains.push(extract_domain(message.hostname));

        register_job(message.hostname).then((jobpk) => {
            // this should populate our job check queue with the 
            // jobpk (for the eventual interval).
            job_queue.push(jobpk);

            job_check_spawner();
            reply(true);
        });
    }
    
    return true;
});

/** Network Request Monitoring */
function extract_before_request(details) {
    // we extract all we can from this event and add it to the
    // object for later serialization. We will harvest most of 
    // the informtion from this event.
    if (details.initiator.includes('chrome-extension')) {
        return;
    } else if (details.initiator.includes('r204.net')) {
        return;
    } else if (details.initiator.includes('recon-webserver')) {
        return;
    }
    
    if (!expected_request_domains.includes(details.url) && !core.suppress_alerts) {
        // we alert the user that something fishy is going on...
        chrome.notifications.create(
            {
                message: `Request to: ${details.url} was not observed when we loading this page! Tread carefully...`,
                iconUrl: "https://static.vecteezy.com/system/resources/previews/014/633/421/original/colorful-pencil-logo-icon-favicon-design-free-vector.jpg",
                title: "Reality-Check: Potentially Malicious Outoing Request",
                type: "basic"
            }
        );
        console.log(`<${extract_domain(details.url)}>[from: ${details.initiator}] is not an expected domain! Be careful...: ${expected_request_domains}`);
    }
}

chrome.webRequest.onBeforeRequest.addListener(extract_before_request, {urls: ["<all_urls>"]}, ["requestBody"]);