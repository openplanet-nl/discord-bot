var Discord = require("discord.js");
var cmdsplit = require("./cmdsplit");

var http = require("http");
var https = require("https");
var url = require("url");
var fs = require("fs");

var client = new Discord.Client();

var config = JSON.parse(fs.readFileSync("config.json"));
var mpdocs = JSON.parse(fs.readFileSync("data/Openplanet.json"));

for (var i = 0; i < config.announcers.length; i++) {
	config.announcers[i].lastKnown = "";
}

client.on("ready", function() {
	console.log("Logged in as " + client.user.tag);

	setInterval(checkAllAnnouncers, 300 * 1000);
	checkAllAnnouncers();
});

client.on("error", function(err) {
	console.log("Discord error: ", err);
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

	console.log("Command from " + msg.member.user.username + ": " + msg.content);

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

	} else if (parse[0] == ".class" && parse.length == 2) {
		var query = parse[1].toLowerCase();

		var ret = "Results:";
		var numResults = 0;

		for (var ns in mpdocs.ns) {
			for (var c in mpdocs.ns[ns]) {
				if (c.toLowerCase().indexOf(query) == -1) {
					continue;
				}

				if (++numResults > 2) {
					continue;
				}

				var cc = mpdocs.ns[ns][c];

				ret += "\n```cpp\n";
				ret += "class " + c;
				if (cc.p) {
					ret += " : " + cc.p;
				}
				ret += ";";
				if (cc.d && cc.d.d) {
					ret += "\n/* " + cc.d.d + " */";
				}
				ret += "``` <https://openplanet.nl/" + c + ">";
			}
		}

		if (numResults == 0) {
			ret = "Nothing found :(";
		} else if (numResults > 2) {
			ret += "\n" + numResults + " more: <https://openplanet.nl/mpdocs/search?q=" + query + ">";
		}

		msg.channel.send(ret);

	} else if (parse[0] == ".classhistory") {
		msg.channel.send("https://github.com/codecat/maniaplanet4-classes/commits/master");
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

		if (modified !== undefined && announcer.lastKnown != "" && announcer.lastKnown != modified) {
			console.log(announcer.name + " has been updated! New date: " + modified);

			var msg = announcer.mentions + "\n:warning: **New update!** " + announcer.name + " is now at *" + modified + "*: <" + announcer.url + ">";

			for (var i = 0; i < announcer.channels.length; i++) {
				var channelId = announcer.channels[i];
				var channel = client.channels.get(channelId);
				if (!channel) {
					console.log("WARNING: Couldn't find Discord channel with ID " + channelId + "!");
					continue;
				}
				channel.send(msg);
			}

			//TODO: Automatically download the file here?
		}

		if (modified !== undefined) {
			config.announcers[index].lastKnown = modified;
		}

		console.log(announcer.name + ": " + modified);
	};

	var req = false;
	if (parsedUrl.protocol == "https:") {
		req = https.request(options, callback);
	} else {
		req = http.request(options, callback);
	}
	req.on("error", function() {
		console.log("Error while trying to get latest version for \"" + announcer.name + "\"");
	});
	req.on("timeout", function() {
		console.log("Timeout while trying to get latest version for \"" + announcer.name + "\"");
	});
	req.end();
}

function checkAllAnnouncers()
{
	for (var i = 0; i < config.announcers.length; i++) {
		checkAnnouncer(i);
	}
}

client.login(config.discordToken);
