var Discord = require("discord.js");
var cmdsplit = require("./cmdsplit");

var http = require("http");
var https = require("https");
var url = require("url");
var fs = require("fs");

var client = new Discord.Client();

var config = JSON.parse(fs.readFileSync("config.json"));

for (var i = 0; i < config.announcers.length; i++) {
	config.announcers[i].lastKnown = "";
}

client.on("ready", function() {
	console.log("Logged in as " + client.user.tag);

	setInterval(checkAllAnnouncers, 300 * 1000);
	checkAllAnnouncers();
});

client.on("message", function(msg) {
	var parse = cmdsplit(msg.content);

	if (parse.indexOf(".logs") != -1) {
		msg.channel.send(":file_folder: **Logs Build**: <http://files.v04.maniaplanet.com/setups/ManiaPlanetLogs.zip>");
		return;
	}

	if (!msg.content.startsWith(".")) {
		return;
	}

	if (parse[0] == ".tracking") {
		var ret = "We are currently tracking " + config.announcers.length + " files:\n\n";

		for (var i = 0; i < config.announcers.length; i++) {
			var announcer = config.announcers[i];
			ret += "- **" + announcer.name + "**, last updated at *" + announcer.lastKnown + "*\n";
		}

		msg.channel.send(ret);

	} else if (parse[0] == ".file" && parse.length == 2) {
		var query = parse[1].toLowerCase();
		var ret = "";
		for (var i = 0; i < config.announcers.length; i++) {
			var announcer = config.announcers[i];

			if (announcer.name.toLowerCase().indexOf(query) == -1) {
				continue;
			}

			ret += ":file_folder: **" + announcer.name + "**: <" + announcer.url + "> *" + announcer.lastKnown + "*\n";
		}
		if (ret == "") {
			ret = "Nothing found :(";
		}
		msg.channel.send(ret);
	}
});

function checkAnnouncer(index)
{
	var announcer = config.announcers[index];
	var parsedUrl = url.parse(announcer.url);

	var options = {
		method: "HEAD",
		host: parsedUrl.host,
		path: parsedUrl.path
	};

	var callback = function(res) {
		var modified = res.headers["last-modified"];

		if (announcer.lastKnown != "" && announcer.lastKnown != modified) {
			console.log(announcer.name + " has been updated! New date: " + modified);

			client.channels.get("id", announcer.channel).send(":warning: **New update!** " + announcer.name + " is now at *" + modified + "*: <" + announcer.url + ">");

			//TODO: Automatically download the file here
		}

		config.announcers[index].lastKnown = modified;
		console.log(announcer.name + ": " + modified);
	};

	var req = false;
	if (parsedUrl.protocol == "https:") {
		req = https.request(options, callback);
	} else {
		req = http.request(options, callback);
	}
	req.end();
}

function checkAllAnnouncers()
{
	for (var i = 0; i < config.announcers.length; i++) {
		checkAnnouncer(i);
	}
}

client.login(config.discordToken);
