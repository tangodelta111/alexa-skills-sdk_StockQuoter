'use strict';
var Alexa = require('alexa-sdk');
var http = require('http');

var APP_ID = 'null';//replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]';
var SKILL_NAME = 'Stock Quoter';


exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

// Alexa intent handlers
var handlers = {
    'LaunchRequest': function () {
        var speechOutput = "Welcome to Stock Quoter. What company would you like to look up?";
        var reprompt = "I can help you get the latest price for a stock. "
                    + "You can simply open Stock Quoter and ask a question like, "
                    + "What's the stock price for Amazon.com. Or you can say exit to quit this skill.  "
                    + "Now, which company should I look up?";
        this.emit(':ask', speechOutput, reprompt);
    },
    'handleOneshotStockIntent': function () {
        intentProcess(this.event.request.intent, this.emit);
    },
    'AMAZON.HelpIntent': function () {
        var reprompt = "Which company would you like to look up?";
        var speechOutput = "I can help you get the latest price for a stock. "
                    + "You can simply open Stock Quoter and ask a question like, "
                    + "What's the stock price for Amazon.com. Or you can say exit to quit this skill.  "
                    + "Now, which company should I look up?";
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', 'Goodbye!');
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', 'Goodbye!');
    }
};


function buildSpeechFromParsed(lookupData, emit){
    var speechOutput;
    if(lookupData.error){
        // do something
        speechOutput = "Sorry, I'm having trouble connecting with the data service. Please try again later.";
        emit(':tell', speechOutput);
    }
    else{
        if(lookupData.upDown){
            if(lookupData.currentStatus == " is "){
                // speechOutput = lookupData.name + lookupData.currentStatus + lookupData.upDown 
                //     + lookupData.changePer + " percent to $" + lookupData.lastPrice + ". "; 
                speechOutput = lookupData.name + lookupData.currentStatus + " currently trading at $" + lookupData.lastPrice + ". "; 
            } 
            else{
                speechOutput = lookupData.name + lookupData.currentStatus + lookupData.upDown 
                    + lookupData.changePer + " percent to $" + lookupData.lastPrice + ". "; 
            }
            
        }
        else{
            if(lookupData.currentStatus == " closed "){
               speechOutput = lookupData.name + lookupData.currentStatus + " with no change at $"
                + lookupData.lastPrice + ". ";  
            }
            else{
                speechOutput = lookupData.name + lookupData.currentStatus + " currently trading at $"
                + lookupData.lastPrice + ". "; 
            }
        }
        if(lookupData.isExtHrs && !lookupData.extStatus){
            speechOutput = speechOutput + "It is " + lookupData.extUpDown + lookupData.extHrsChangePer + " percent to $" + lookupData.extHrsPrice + " in " + lookupData.extStatus + ". ";
        }
    }
    emit(':tellWithCard', speechOutput, SKILL_NAME, speechOutput);
}

//This function takes what's given in the intent and returns stock symbol
function intentProcess(intentdata, emit) {
    console.log("Processing Intent");
    var query = intentdata.slots.CompanyName;
    // slots can be missing, or slots can be provided but with empty value.
    // must test for both.
    if (!query || !query.value) {
        console.log("Slot missing or empty value");
        console.log("Query value: " + query.value);
        var reprompt = "What would you like me to do? For example, you can say. What is the stock price of Tesla.";
        var speechOutput = "Sorry, I didn't get that. What company would you like to look up?";
        emit(':ask', speechOutput, reprompt);
    } else {
        var userquery = query.value;
        //calls function that goes out and asks the stock symbol query api
        makeSymbolRequestandMore(userquery, emit);
    }
}
//Go and look up the stock symbol from intent, then get data from google api and parse.
function makeSymbolRequestandMore(userdemand, emit) {
    var endpoint = 'http://api.######.com:208/v1/finance/symbolQuery'; //UPDATE This endpoint URL to your own server
    var queryString = '?ask=' + userdemand;
    var symbolReturn;
    http.get(endpoint + queryString, function (res) {
        var symbolResponseString = '';
        console.log('Status Code: ' + res.statusCode);

        if (res.statusCode != 200) {
            console.log("r://api connError");
            var speechOutput = "I'm sorry. I seem to be having trouble connecting to the data service. Please try again later.";
            emit(':tell', speechOutput);
        }

        res.on('data', function (data) {
            symbolResponseString += data;
        });

        res.on('end', function () {
            var symbolResponseObject = JSON.parse(symbolResponseString);
            if (symbolResponseObject.status == "notfound") {
                console.log("Error symbol lookup: " + symbolResponseObject.status);
                var reprompt = "You can say. What is the stock price of Netflix.";
                var speechOutput = "Sorry, I couldn't find that company. Let's try another. What company would you like to look up?";
                emit(':ask', speechOutput, reprompt);
            } else {
                var symbolResponse = {
                    name: symbolResponseObject.name,
                    symbol: symbolResponseObject.symbol,
                    market: symbolResponseObject.market};
               makeLookupRequest(symbolResponse, emit);
            }
        });
    }).on('error', function (e) {
        console.log("Communications error with r://api: " + e.message);
        var speechOutput = "I'm sorry. Stock Quoter is experiencing some technical difficulties connecting to data services. Please try again later.";
        emit(':tell', speechOutput);
    });
}

//looks up stock symbol on google finance
function makeLookupRequest(symbolResponse, emit){
    var endpoint = 'http://finance.google.com/finance/info';
    var queryString = '?client=ig&q=' + symbolResponse.symbol;

    http.get(endpoint + queryString, function (res) {
        var lookupResponseString = '';
        console.log('Status Code: ' + res.statusCode);
        if (res.statusCode != 200) {
            console.log("fin.Google connError");
            var speechOutput = "I'm sorry. Stock Quoter is experiencing some technical difficulties connecting to data services. Please try again later.";
            emit(':tell', speechOutput);
        }

        res.on('data', function (data) {
            lookupResponseString += data;
        });

        res.on('end', function () {
            lookupResponseString = lookupResponseString.substr(3);

            var lookupResponseObject = JSON.parse(lookupResponseString);

            var parsedGoogleData = dataParse(symbolResponse.name, lookupResponseObject[0]);
            buildSpeechFromParsed(parsedGoogleData, emit);
            
        });
    }).on('error', function (e) {
        console.log("Communications error with Google: " + e.message);
        var speechOutput = "I'm sorry. Stock Quoter is experiencing some technical difficulties connecting to data services. Please try again later.";
        emit(':tell', speechOutput);
    });
}

//Takes google data and parses it to useful data for building speechoutput
function dataParse(passedName, lookupResponseObject){
    var lastPriceData = lookupResponseObject.l;
    var changePercentData = lookupResponseObject.cp;
    var extHrsPriceData = lookupResponseObject.el;
    var extHrsChangePercentData = lookupResponseObject.ecp;

    var upDownData;
    var extUpDownData;
    var isExtHrsData;
    var currentStatusData;
    var extStatusData;


    if(parseFloat(changePercentData) < 0){
        upDownData = " down ";
        changePercentData = Math.abs(changePercentData);
    }
    else if(parseFloat(changePercentData) > 0){
        upDownData = " up ";
    }
    else{
        upDownData = undefined;
    }

    if(extHrsPriceData){
        if(parseFloat(extHrsChangePercentData) <= -1){
            extUpDownData = " down ";
            isExtHrsData = true;
            extHrsChangePercentData = Math.abs(extHrsChangePercentData);
        }
        else if(parseFloat(extHrsChangePercentData) >= 1){
            extUpDownData = " up ";
            isExtHrsData = true;
        }
        else{
            extUpDownData = undefined;
            isExtHrsData = false;
        }
    }
    else{
        isExtHrsData = false;
    }
    
    var datea = new Date();
    var currHr = datea.getHours();
    var currMin = datea.getMinutes();
    var date = datea.getDate();
    
    if(currHr == 14){
        if (currMin < 30){
        currentStatusData = " closed ";
        extStatusData = " pre-market trading ";
        console.log("PreMarket");
      }
      else{
        currentStatusData = " is ";
        extStatusData = undefined;
        console.log("Regular Hours");
      }
    }
    else if(currHr >= 9 && currHr < 14){
        currentStatusData = " closed ";
        extStatusData = " pre-market trading ";
        console.log("PreMarket");
    }
    else if(currHr >= 15 && currHr < 21){
        currentStatusData = " is ";
        extStatusData = undefined;
        console.log(" Regular Hours ");
    }
    else if(currHr == 21){
        if (currMin >= 15){
        currentStatusData = " closed ";
        extStatusData = " after-hours trading ";
        console.log("After Hours");
      }
      else{
        currentStatusData = " closed ";
        extStatusData = undefined;
        console.log("Closed");
      }
    }
    else if(currHr > 21 && currHr < 1){
        currentStatusData = " closed ";
        extStatusData = " after-hours trading ";
        console.log("After Hours");
    }
    else{
        currentStatusData = " closed ";
        extStatusData = undefined;
        console.log("Closed");
    }

    return{
        name: passedName,
        lastPrice: lastPriceData,
        changePer: changePercentData,
        extHrsPrice: extHrsPriceData,
        extHrsChangePer: extHrsChangePercentData,
        upDown: upDownData,
        extUpDown: extUpDownData,
        isExtHrs: isExtHrsData,
        currentStatus: currentStatusData,
        extStatus: extStatusData
    };
}




