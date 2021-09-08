require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dns = require('dns');
const urlParse = require('url');
const app = express();

// Basic Configuration
const port = 8080;

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const Schema = mongoose.Schema;

const urlSchema = new Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true },
});

const UrlShort = mongoose.model("UrlShort", urlSchema);

app.get("/api/shorturl/:id", async function(req, res) {
  const { id } = req.params;

  const entryResult = await UrlShort.findOne({ short_url: id });

  if (entryResult) {
    res.redirect(entryResult.original_url);
  }
  else {
    res.json({ error: 'invalid id' });
  }

});

app.post("/api/shorturl", async function(req, res) {
  const { url } = req.body;

  // Check if url is valid
  dns.lookup(urlParse.parse(url).hostname, async (err, ip) => {
    if (!ip) {
      console.log("error");
      res.json({ error: 'invalid url' });
    } else {
      // Find entry with the given url
      const urlInfo = await UrlShort.findOne({ original_url: url });

      // If the entry is not yet in database
      if (!urlInfo) {
        // Find the max shortUrl
        const urlMaxColl = await UrlShort.findOne().sort({ short_url: -1 }).limit(1);

        // Set the new max shortUrl for the given url
        let urlMax;
        if (urlMaxColl) {
          urlMax = urlMaxColl.short_url + 1
        } else {
          urlMax = 1;
        }

        // Create entry with the given url
        await UrlShort.create({ original_url: url, short_url: urlMax });
      }

      const entryResult = await UrlShort.findOne({ original_url: url });

      res.json({ original_url: entryResult.original_url, short_url: entryResult.short_url });
    }
  });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}.`);
});
