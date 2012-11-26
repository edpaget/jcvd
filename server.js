var express = require('express');

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
  key = Math.floor((Math.random() * 100000) + 1);
  redis.set(key, toCSV(req.body));

  body = JSON.stringify({ data_url: key }); 
  corsHeaders(res);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Conent-Length', body.length);
  res.send(body);
});

app.get('/to-csv/:id', function(req, res) {
  var id = req.params.id
  csv = redis.get(id, function(err, reply) {
    redis.del(id);
    corsHeaders(res);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment;filename=navigator_data.csv');
    res.setHeader('Content-Length', reply.length);
    res.send(reply);
  });
});

var toCSV = function(data) {
  var headers = function(datum, prefix) {
    prefix = typeof prefix !== 'undefined' ? prefix : '';
    var header = new String();
    for(var key in datum) {
      var value = datum[key];
      if(typeof value === 'object'){
        header = header + headers(value, key + '_');
      }
      else {
        header = header + ',' + prefix + key;
      }
    }
    return header;
  };

  var bodyLines = function(data) {
    var body = new Array();
    for(var i in data) {
      body.push(lines(data[i]).slice(1));
    }
    return body.join('\n');
  };

  var lines = function(datum) {
    var line = new String;
    for(var key in datum) {
      var value = datum[key];
      if(typeof value !== 'function'){
        if(typeof value === 'object'){
          line = line + lines(value);
        }
        else {
          line = line + "," + value;
        }
      }
    }
    return line;
  };

  header = (headers(data[0]) + '\n').slice(1);
  body = bodyLines(data)
  return header + body
};