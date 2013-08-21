var express = require('express');
var crypto = require('crypto');

var app = express();
app.use(express.bodyParser());
app.use(express.logger());

var server = require('http').createServer(app);
var port = process.env.PORT || 3001;
server.listen(port)

console.log("Server started at: ", port);

if ( port === 3001 ) {
  var redis = require('redis').createClient();
  console.log("Connected to Local Redis");
} else {
  var redisUrl = require('url').parse(process.env.REDISTOGO_URL);
  var redis = require('redis').createClient(redisUrl.port, redisUrl.hostname);
  redis.auth(redisUrl.auth.split(":")[1]);
  console.log("Connected to RegisToGo instance");
}

var corsHeaders = function(res) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
};

app.options("*", function(req, res) {
  corsHeaders(res);
  res.send();
});

app.post('/to-csv', function(req, res) {
  json = req.body;
  key = crypto.createHash('md5').update(JSON.stringify(json)).digest('hex');
  redis.exists(key, function(err, reply) {
    if (reply !== 1) {
      console.log(typeof json);
      redis.set(key, toCSV(json));
    }
    body = JSON.stringify({ data_url: key }); 
    corsHeaders(res);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Conent-Length', body.length);
    res.send(body);
  });
});

app.get('/to-csv/:id', function(req, res) {
  var id = req.params.id
  csv = redis.get(id, function(err, reply) {
    corsHeaders(res);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment;filename=data.csv');
    res.setHeader('Content-Length', reply.length);
    res.send(reply);
  });
});

var toCSV = function(data) {
  var header = function(data) {
    var headers = new Array();
    var addHeaders = function(datum, prefix) {
      prefix = typeof prefix !== 'undefined' ? prefix : ''
      for (var key in datum) {
        if (headers.indexOf(prefix + key) === -1) {
          var value = datum[key];
          if (typeof value === 'object') {
            addHeaders(value, key + '.');
          } else if ((typeof value !== 'function') && (key !== "id")) {
            headers.push(prefix + key);
          }
        }
      }
    }
    for (var i in data) {
      addHeaders(data[i]);
    }
    return headers;
  }

  var body = function(data, headers) {
    var lines = function(datum, headers) {
      for(var i in headers) {
        var header = headers[i];
        if (header.match(/\./)) {
          keys = header.split(/\./);
          lines(datum[keys.shift()], [keys.join('.')]);
        } else {
          value = typeof datum[header] !== 'undefined' ? datum[header] : 'null';
          line.push(value);
        }
      }
    }

    var body = new Array();
    for(var i in data) {
      var line = new Array()
      lines(data[i], headers);
      body.push(line.join(','));
    }
    return body.join('\n');
  }

  headers = header(data);
  lines = body(data, headers);
  return headers.join(',') + '\n' + lines
};