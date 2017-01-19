'use strict';
const CryptoJS = require("crypto-js");
const CONFIG = require('./config');
const http =  require('http');
const template = require('./template');
const SparkPost = require('sparkpost');

let sparkpostClient = new SparkPost(CONFIG.sparkpostKey);

//set variables
const page_size = 10;
const timezoneOffset = -8; // US Pacific Time
const expiration = 3600; // 1 hour,

let d = new Date();
let unixtime = parseInt(d.getTime() / 1000);
let future_unixtime = unixtime + expiration;
let publicKey = CONFIG.publicKey;
let privateKey = CONFIG.privateKey;
let method = "GET";
let route = "entries";
let emailMessage;
let reminderSubject;

// Build URL String for Gravity Forms Api
let stringToSign = publicKey + ":" + method + ":" + route + ":" + future_unixtime;
let sig = calculateSig(stringToSign, privateKey);
let url = CONFIG.site + '/gravityformsapi/' + route + '/?api_key=' + publicKey + '&signature=' + sig + '&expires=' + future_unixtime;
url += '&paging[page_size]=' + page_size;

/** Helper Functions **/

// calculate the signature needed for authentication
function calculateSig(stringToSign, privateKey) {
  let hash = CryptoJS.HmacSHA1(stringToSign, privateKey);
  let base64 = hash.toString(CryptoJS.enc.Base64);
  return encodeURIComponent(base64);
}

// Adds days to current date of a specific timezone and returns updated date
function addDays(days, timezone) {
  const tz = timezone || 0;
  let date = new Date();
  let utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const nDate = new Date(utc + (3600000 * tz));
  nDate.setDate(nDate.getDate() + days);
  return nDate;
}

// formats date for url search => MM-DD-YYYY
function formatDate(date) {
   return ('00' + (date.getMonth() + 1)).slice(-2) + '-' +
          ('00' + date.getDate()).slice(-2) + '-' +
          date.getFullYear();
}

// formats search criteria for gravity forms api, key is fixed to `5`
function formatSearchCriteria(searchVal) {
  return '&search=' + encodeURI(JSON.stringify({
    field_filters: [{
        key: '5',
        operator: 'is',
        value: searchVal
    }]
  }));
}

// Get Data using http package
function getData(url, callback) {
  http.get(url, function (res) {
    let statusCode = res.statusCode;
    let contentType = res.headers['content-type'];

    let error = void 0;
    if (statusCode !== 200) {
      error = new Error('Request Failed.\n' + ('Status Code: ' + statusCode));
    } else if (!/^application\/json/.test(contentType)) {
      error = new Error('Invalid content-type.\n' + ('Expected application/json but received ' + contentType));
    }
    if (error) {
      console.log(error.message);
      // consume response data to free up memory
      res.resume();
      return;
    }

    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', function (chunk) {
      return rawData += chunk;
    });
    res.on('end', function () {
      try {
        let parsedData = JSON.parse(rawData);
        callback(parsedData);
      } catch (e) {
        console.log(e.message);
      }
    });
  }).on('error', function (e) {
    console.log('Got error: ' + e.message);
  });
}

/** App Functions **/

// send emails via sparkpost
function sendEmail(data) {
  sparkpostClient.transmissions.send({
    content: {
      from: CONFIG.fromEmail,
      subject: reminderSubject,
      html: template.createTemplate(data['4'], data['5'], emailMessage)
    },
    recipients: [
      {address: data['2']}
    ]
  })
  .then(data => {
    console.log('Sent Mail!');
  })
  .catch(err => {
    console.log('Whoops! Something went wrong');
    console.log(err);
  });
}

/** 
 * Uncomment exports.handler line and accompanying closing bracket before
 * sending to AWS Lambda
 **/

// exports.handler = (event, context, callback) => {
// call the Reminder Email Settings
getData('http://tuleyome.org/wp-json/acf/v2/options', setReminderSettings);

// change me
function setReminderSettings(data) {
  emailMessage = data.acf.email_message;
  reminderSubject = data.acf.reminder_subject;
  const searchDate = formatDate(addDays(Number(data.acf.days_before), timezoneOffset));
  // convert to a JSON string and url encode it so the JSON formatting persists
  url += formatSearchCriteria(searchDate);

  // call the Reminder Email Settings
  getData(url, setupEmails);
}

// Loops through data and sends email for each entry
function setupEmails(data) {
  data.response.entries.forEach((d) => {
    sendEmail(d);
  });
}
// }