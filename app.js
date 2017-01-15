var CryptoJS = require("crypto-js");
var CONFIG = require('./config');
var http =  require('http');


//calculate the signature needed for authentication
function CalculateSig(stringToSign, privateKey){
  var hash = CryptoJS.HmacSHA1(stringToSign, privateKey);
  var base64 = hash.toString(CryptoJS.enc.Base64);
  return encodeURIComponent(base64);
}

//set variables
var d = new Date();
var expiration = 3600; // 1 hour,
var unixtime = parseInt(d.getTime() / 1000);
var future_unixtime = unixtime + expiration;
var publicKey = CONFIG.publicKey;
var privateKey = CONFIG.privateKey;
var method = "GET";
var route = "entries";
var page_size = 10;

// Build URL String
var stringToSign = publicKey + ":" + method + ":" + route + ":" + future_unixtime;
var sig = CalculateSig(stringToSign, privateKey);
var url = CONFIG.site + '/gravityformsapi/' + route + '/?api_key=' + publicKey + '&signature=' + sig + '&expires=' + future_unixtime;
url += '&paging[page_size]=' + page_size;


// Get Data from Gravity forms URL
http.get(url, function (res) {
  var statusCode = res.statusCode;
  var contentType = res.headers['content-type'];

  var error = void 0;
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
  var rawData = '';
  res.on('data', function (chunk) {
    return rawData += chunk;
  });
  res.on('end', function () {
    try {
      var parsedData = JSON.parse(rawData);
      console.log(parsedData.response.entries[0]);
    } catch (e) {
      console.log(e.message);
    }
  });
}).on('error', function (e) {
  console.log('Got error: ' + e.message);
});
