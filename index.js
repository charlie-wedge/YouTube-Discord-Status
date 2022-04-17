// Displays the current YouTube video playing onto the Discord profile as a rich presence

const fs = require('fs');
const getChromeTabs = require('get-chrome-tabs');
const request = require('request');
const discordRPC = require('discord-rpc'); // a neat library which allows rich presence in node (an absolute life saver)
const { RPCCloseCodes } = require('discord-rpc/src/constants');

const clientId = "961385115911594054";
discordRPC.register(clientId);
const rpc = new discordRPC.Client({transport: 'ipc'});

var currentURL = ""; // the current video playing (don't touch this)

const googleAPIKey = ""; // ENTER YOUR API KEY HERE
/*
TO GET YOUR API KEY:
- visit https://console.cloud.google.com/
[YOU DO NOT NEED TO START ANY TRIAL]
- Select "Select a project"
- Select "NEW PROJECT"
- Give it a name such as "YouTube Discord Status"
- Create
- Open the project (you may have to visit the original URL again and select "Select a project" again)
- Open the API page (you may have to open "Explore and enable APIs" under 'Getting Started')
- Press "Credentials" on the left
- Press "+ CREATE CREDENTIALS" at the top > API key
- Copy the API key into the googleAPIKey variable in THIS script
- DO NOT SHARE YOUR API KEY WITH ANYBODY
*/

console.log("Script started...");

rpc.on('ready', () => {
    console.log("RPC started.");
    cycleLoop();
});

rpc.login({clientId}).catch(console.error);

function cycleLoop() {
    let randomNum = Math.random() * (33000 - 28000) + 28000; // random numbers means the elapsed time doens't always end at multiplies of x
    setTimeout(cycleLoop, randomNum);
    check();
    console.log("Next check in " + Math.floor(randomNum/1000) + " seconds");
}

function check() {
    console.log("\nchecking...");
    (async () => {
        let res = undefined;
        try {
          res = await getChromeTabs();
        } catch (err) {
          err.message; //=> 'Tried to get tabs of Chrome, but Chrome is currently not running.'
        }
    
        if (res == undefined) {
            console.log("Chrome is not open.");
            rpc.clearActivity();
            return;
        }
        // there are tabs open: 
        let index = findActiveTab(res);
        if (index == -1) {
            console.log("No valid tabs are currently active.");
            rpc.clearActivity();
            return;
        }

        let url = getURL(res, index);

        if (url == currentURL) return console.log("The original video is still playing.");
        currentURL = url;

        getVideoInfo(url);


    })();
}


function getURL(res, index) {

    let url = res[index].url;

    console.log("Video URL: " + url);

    return url;
}

function findActiveTab(res) { // returns the index of the active tab within all the open tabs
    for (i=0; i<res.length; i++) {
        if (res[i].active && res[i].windowVisible && res[i].url.startsWith("https://www.youtube.com/watch")) return i;
    }
    return -1;
}

async function getVideoInfo(url) { // uses the YouTube API to get video info
    let id = url.split("https://www.youtube.com/watch?v=")[1];
    console.log("Video ID: " + id);

    str = "https://www.googleapis.com/youtube/v3/videos?id=";
    str += id;
    str += "&key=" + googleAPIKey + "%20&part=snippet,contentDetails"; // snippet is all that's required. contentDetails is only requied if we're using the time left rather than elapsed time in the setActivity() function 

    request(str, { json: true }, (err, res, body) => {
 		if (err) return -1;

        let title = body.items[0].snippet.title
		console.log("The title of the video is: " + title);
        setActivity(body.items[0]);
	});

}

async function setActivity(info) {
    if (!rpc) return;

    let title = info.snippet.title;
    let channelName = info.snippet.channelTitle;
    //let videoURL = "youtu.be/" + info.id;
    let videoURL = "https://www.youtube.com/watch?v=" + info.id;
    
    let videoType = info.snippet.categoryId; // the type of video (music, gaming etc.)
    let imageKey;
    let imageText;

    switch (videoType) {
        case "10": // music
            imageKey = "youtube_music_logo";
            imageText = "YouTube Music";
            break;
        default: // anything else
            imageKey = "youtube_logo";
            imageText = "YouTube";
            break;
    }

/*
    // Time left: (rather than time elapsed)
    let length = info.contentDetails.duration; // a stupidly formated string thanks youtube. EG: "PT3M23S" (meaning 3 minutes 23 seconds)
    console.log(length);
    let timeAtVideoEnd = new Date().getTime();

    {
        let minutes;
        let secondsSplit = "M";
        if (length.length >= 6) {
            minutes = length.split("PT")[1].split("M")[0];
        }
        else {
            minutes = 0;
            secondsSplit = "PT"
        }
        let seconds = length.split(secondsSplit)[1].split("S")[0];
        let extraLength = (minutes*60000) + (seconds*1000);
        timeAtVideoEnd += extraLength;
    }
*/
    rpc.setActivity({ // the info to put on the rich presence (options can be viewed in the Discord Developer Portal > Applications > Rich Presence > Visualizer > Show Code)
        details: title,
        //state: url,
        state: channelName,
        startTimestamp: new Date().getTime(),
        //endTimestamp: timeAtVideoEnd,
        largeImageKey: imageKey,
        largeImageText: imageText,
        instance: false,
        buttons: [
            {
                label: "Open in YouTube",
                url: videoURL
            }
        ],
      });
      console.log("Changed the Discord activity.");

}



