const CryptoJS = require("crypto-js");
const CONFIG = require('./config');
const http =  require('http');
const SparkPost = require('sparkpost');

let sparkpostClient = new SparkPost(CONFIG.sparkpostKey);

// calculate the signature needed for authentication
function calculateSig(stringToSign, privateKey){
  let hash = CryptoJS.HmacSHA1(stringToSign, privateKey);
  let base64 = hash.toString(CryptoJS.enc.Base64);
  return encodeURIComponent(base64);
}

// send emails via sparkpost
function sendEmail(message) {
  sparkpostClient.transmissions.send({
    content: {
      from: CONFIG.fromEmail,
      subject: 'Hello, World!',
      html:'<html><body><p>Testing SparkPost - the world\'s most awesomest email service!</p><p>' + message + '</p></body></html>'
    },
    recipients: [

    ]
  })
  .then(data => {
    console.log('Woohoo! You just sent your first mailing!');
    // callback(null, 'sent email!');
    console.log(data);
  })
  .catch(err => {
    console.log('Whoops! Something went wrong');
    console.log(err);
    // callback(err);
  });
}

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

// Get the Remider Email Settings
getData(url, console.log)
