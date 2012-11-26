var express = require('express');

var app = express();
app.use(express.bodyParser());
app.use(express.logger());

var server = require('http').createServer(app);
var port = process.env.PORT || 3001;
server.listen(port)

console.log("Server started at: ", port);

app.options("*", function(req, res) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.send();
});

app.post('/to-csv', function(req, res) {

  console.log(toCSV(req.body));

  res.send('THANKS!');
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