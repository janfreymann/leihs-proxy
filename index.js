var express = require('express')
var app = express();
var httpProxy = require('http-proxy');
var leihsProxy = httpProxy.createProxyServer();

var serverLeihs = 'http://127.0.0.1:3000';

var config = require('./config');
var mysql = require('mysql');
var connection = mysql.createConnection({
    host: '127.0.0.1',
    user: config.MYSQL_USER,
    password : config.MYSQL_PASS,
    database: config.MYSQL_DB
});

var selects = [];
var simpleselect = {};

var customscript = ` 
<!-- Modal -->

<script>
console.log("searching for packages...");
var modal = '<div aria-hidden="false" class="modal fade ui-modal medium in ui-shown"><h2>Check package components:</h2><ul id="mht_package_list"></ul></div>';

var showModal = false;

$( ".col2of10.line-col.text-align-center").each(function(i, obj) {
    var item_id = $(obj).children().first().text();
    var item_number = parseInt(item_id); 
    console.log("ajax url: " + "/mht_get_package_children?id=" + item_number);
    
    $.get( "/mht_get_package_children?id=" + item_id, function( data ) {
      console.log("Result: " + JSON.stringify(data));

      if(data.length > 0) {

        if(!showModal) { $( "body" ).append(modal); showModal = true; }

         for(var k in data) {
        // mht_package_list
        $('#mht_package_list').append("<li>inventory code " + data[k] + "</lid>");
      }
      }

     
    });
});




</script>
`;

// col2of10 line-col text-align-center


simpleselect.query = 'body';
simpleselect.func = function (node) {
  var rs = node.createReadStream();
  var ws = node.createWriteStream({outer: false});

  rs.pipe(ws, {end: false});

  
  
  // When the read stream has ended, attach our style to the end
  rs.on('end', function(){
    ws.end(customscript);
  });
    
}

selects.push(simpleselect);

var only = function(middleware) {
    return function(req, res, next) {
      var tmp = req.path.split('/');
      var endswith = tmp.pop();
      console.log("endswith: " + endswith + " method: " + req.method);
      if((endswith == 'take_back') && (req.method == 'GET')) {
        return middleware(req, res, next);
      }
      else {
        return next();
      }
    };
};

var harmon = require('harmon-binary')([], selects);

app.use(only(harmon));

app.get('/mht_get_package_children', function(req, res) {
  console.log('processing /mht_get_package_children');
  var id = req.query.id;
  console.log("request for id: " + id);
  
  // 1st: get id for inventory_code
  // 2nd: get inventory code list with matching parent_id

  var query = "SELECT id FROM items WHERE inventory_code = " + connection.escape(id) + ";";
  connection.query(query, function(err, rows, fields) {
    if(err) {
      console.log("mysql error: " + err);
       res.end(JSON.stringify([]));
    }
    else {
      if(rows.length > 0) {
        var package_id = rows[0].id;
        var query2 = "SELECT inventory_code FROM items WHERE parent_id = " + connection.escape(package_id) + ";";
          connection.query(query2, function (err, rows, fields) {
            res.writeHead(200, {"Content-Type": "application/json"}); 
            if(err) {
              console.log("mysql error: " + err);
              res.end(JSON.stringify([]));
            }
            else {
              var id_list = [];
              for(var k in rows) {
                id_list.push(rows[k].inventory_code);
              }
              res.end(JSON.stringify(id_list));
            }
          });
      }
    }
  });
  
 
});

app.all('/*', function(req, res) {
  console.log("redirecting " + req.url);

 // if((req.method == "GET") && (req.url.match('mht_get_package')))
  leihsProxy.web(req, res, {target : serverLeihs});
});

//var bodyParser = require('body-parser')

/*var proxy = require('express-http-proxy');

app.use('/', proxy('127.0.0.1:3000', {
  intercept: function(rsp, data, req, res, callback) {
    // rsp - original response from the target
    //data = JSON.parse(data.toString('utf8'));
    console.log('intercept');
    callback(null, data);
  }
}));*/

/*app.get('/', function (req, res) {
  res.end('<h1>Leihs Proxy</h1><iframe src="http://127.0.0.1:3000"></iframe>');
});*/

/*app.use(bodyParser());

var request = require('request');
app.get('/*', function(req,res) {
  //modify the url in any way you want
  var newurl = 'http://127.0.0.1:3000' + req.url;
  request(newurl).pipe(res);
});

app.post('/*', function(req, res) {
	var newurl = 'http://127.0.0.1:3000' + req.url;
	console.log("post data: " + JSON.stringify(req.body));
  
  request.post({
  url:     newurl,
  form:    req.body,
	}).pipe(res);
});
*/



app.listen(8888, function () {
  console.log('Leihs proxy app listening on port 8888!')
})

