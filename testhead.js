var https = require("https");

var req = https.request({
	method: "HEAD",
	host: "files-v4.live.maniaplanet.com",
	path: "/titles/TMLagoon@nadeo/TMLagoon@nadeo.Title.Pack.gbx"
}, function(res) {
	console.log(JSON.stringify(res.headers));
});
req.end();
