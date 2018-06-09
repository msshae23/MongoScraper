// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");

var Note = require("./models/post.js");
var Article = require("./models/articles.js");

// Scraping tools
var request = require("request");
var cheerio = require("cheerio");

mongoose.Promise = Promise;

var app = express();

app.use(logger("dev"));
app.use(bodyParser.urlencoded({
	extended: false
}));

// Requiring Handlebars
let exphbs = require("express-handlebars");
app.engine("handlebars", exphbs({defaultLayout: "main"}));
app.set("view engine", "handlebars");

// Make public a static dir
app.use(express.static("public"));

var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect("mongodb://heroku_project123:12345ste@ds253840.mlab.com:53840/heroku_st7zjn7b");
var db = mongoose.connection;

db.on("error", function(error) {
	console.log("Mongoose Error: ", error);
});

db.once("open", function() {
	console.log("Mongoose connection successful.");
});

// Routes
// A GET request to scrape the nypost website
app.get("/", function(req, res) {
  // Grab every doc in the Articles array
  Article.find({}, function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    else {
      //res.json(doc);
      res.render("index", {articles: doc});
    }
  });
});

app.get("/scrape", function(req, res) {
	request("http://nypost.com/living/", function(error, response, html) {
		var $ = cheerio.load(html);
		$("article h3").each(function(i, element) {
			var result = {};

			result.title = $(this).children("a").text();
			result.link = $(this).children("a").attr("href");

			var entry = new Article(result);

			entry.save(function(err, doc) {
				// Log any errors
				if (err) {
					console.log(err);
				}
				else {
					console.log(doc);
				}
			});
		});
	});
	
	res.redirect("/");
});

// This will get the articles we scraped from the mongoDB
app.get("/articles", function(req, res) {

	// Grabs all of the articles array
	Article.find({}, function(error, doc) {
		// Log any errors
		if (error) {
			console.log(error);
		}
		// Otherwise, send the doc to the browser as a json object
		else {
			res.json(doc);
		}
	});
});

app.get("/articles/:id", function(req, res) {
	Article.findOne({ "_id": req.params.id })
	.populate("note")
	.exec(function(error, doc) {
		// Log any errors
		if (error) {
			console.log(error);
		}
				else {
			res.json(doc);
		}
	});
});

// Create a new note or replace an existing note
app.post("/articles/:id", function(req, res) {
	var newNote = new Note(req.body);

	newNote.save(function(error, doc) {
		// Log any errors
		if (error) {
			console.log(error);
		}
		// Otherwise
		else {
			Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
			.exec(function(err, doc) {
				if (err) {
					console.log(err);
				}
				else {
					res.send(doc);
				}
			});
		}
	});
});

// Listen on port 3010
app.listen(process.env.PORT || 3010, function() {
	console.log("App running on port 3010.");
});