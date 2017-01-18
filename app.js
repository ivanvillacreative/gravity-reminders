'use strict';
const CryptoJS = require("crypto-js");
const CONFIG = require('./config');
const http =  require('http');
const template = require('./template');
const SparkPost = require('sparkpost');

let sparkpostClient = new SparkPost(CONFIG.sparkpostKey);

// exports.handler = (event, context, callback) => {
//set variables
let d = new Date();
let expiration = 3600; // 1 hour,
let unixtime = parseInt(d.getTime() / 1000);
let future_unixtime = unixtime + expiration;
let publicKey = CONFIG.publicKey;
let privateKey = CONFIG.privateKey;
let method = "GET";
let route = "entries";
let page_size = 10;
let emailMessage;
let reminderSubject;

/** Helper Functions **/

// calculate the signature needed for authentication
function calculateSig(stringToSign, privateKey){
  let hash = CryptoJS.HmacSHA1(stringToSign, privateKey);
  let base64 = hash.toString(CryptoJS.enc.Base64);
  return encodeURIComponent(base64);
}

// builds date
function addDays(days) {
  let date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

// formats date for url search
function formatDate(date) { return ('00' + (date.getMonth() + 1)).slice(-2) + '-' + ('00' + date.getDate()).slice(-2) + '-' + date.getFullYear()}

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
    console.log('Woohoo! sent mail!');
    // callback(null, 'sent email!');
  })
  .catch(err => {
    console.log('Whoops! Something went wrong');
    console.log(err);
    // callback(err);
  });
}



// Gravity forms Search Criteria
let search = {
    field_filters: [{
        key: '5',
        operator: 'is',
        value: ""
    }]
};



// Build URL String
let stringToSign = publicKey + ":" + method + ":" + route + ":" + future_unixtime;
let sig = calculateSig(stringToSign, privateKey);
let url = CONFIG.site + '/gravityformsapi/' + route + '/?api_key=' + publicKey + '&signature=' + sig + '&expires=' + future_unixtime;
url += '&paging[page_size]=' + page_size;


// Get Data
function getData(url,callback){
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
        // console.log(parsedData.response.entries[0]);
        //sendEmail(JSON.stringify(parsedData.response.entries[0]));
      } catch (e) {
        console.log(e.message);
      }
    });
  }).on('error', function (e) {
    console.log('Got error: ' + e.message);
  });
}



// call the Remider Email Settings
getData('http://tuleyome.org/wp-json/acf/v2/options', setReminderSettings);

//change me
function setReminderSettings(data) {
  emailMessage = data.acf.email_message;
  reminderSubject = data.acf.reminder_subject;
  search.field_filters[0].value = formatDate(addDays(Number(data.acf.days_before)));

  //convert to a JSON string and url encode it so the JSON formatting persists
  const searchString = encodeURI(JSON.stringify(search));
  url += '&search=' + searchString;

  // call the Remider Email Settings
  getData(url, setupEmails);
}


function setupEmails(data) {
  // console.log(JSON.stringify(data));
  data.response.entries.forEach((d) => {
    //console.log(d["5"]);
    sendEmail(d);
  });
}
