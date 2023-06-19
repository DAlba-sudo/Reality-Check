// this is going to be the production file for the 
// reality-check extension.

import { data_post, core } from './helper.js'

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
    })

    if (data['state'] != 'DN') {
        setTimeout(job_check(jobpk), 1400);
    } else {
        for (let domain in data['result']) {
            expected_request_domains.push(domain);
        }
    }

    return true;
}

function job_check_spawner() {
    if (job_queue.length <= 0) {

    } else {
        for (let jobpk of job_queue) {
            job_check(jobpk);
        }
    }
}

chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message.action == "data-email") {
        register_consumer(message.email).then((token) => {
            core.consumer_token = token;
            reply(token);
        });
    } 
    
    if (message.action == "init-url" && core.consumer_token != null) {
        console.log("Registering job: " + message.hostname);
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

