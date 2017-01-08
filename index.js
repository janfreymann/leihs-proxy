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
var selects2 = [];
var simpleselect_handover = {};

var customscript = ` 
<!-- Modal -->

<script>
console.log("searching for packages...");
var modal = '<div id="mhtPackageDialog" aria-hidden="false" class="modal fade ui-modal medium in ui-shown"><h2>Check package components:</h2><form id="packageForm"><ul id="mht_package_list"></ul><button type="button" onClick="checkPackageCodes();">Check & Close</button></form></div>';

var showModal = false;

var packageCodes = [];

$( ".col2of10.line-col.text-align-center").each(function(i, obj) {
    var item_id = $(obj).children().first().text();
    var item_number = parseInt(item_id); 
    console.log("ajax url: " + "/mht_get_package_children?id=" + item_number);
    
    $.get( "/mht_get_package_children?id=" + item_id, function( data ) {
      console.log("Result: " + JSON.stringify(data));

      if(data.length > 0) {

        if(!showModal) { 
          $('.button.green').hide();
          $( "body" ).append(modal); 
          showModal = true; 
        }

         for(var k in data) {
        // mht_package_list
        $('#mht_package_list').append('<li id="li' + data[k].inventory_code + '">' + data[k].product + '<input type="text" id="ic' + data[k].inventory_code + '"></input></li>');        
        packageCodes.push(data[k].inventory_code);
      }
      }

     
    });
});

function checkPackageCodes() {
  if(packageCodes.length == 0) {
    $('#mhtPackageDialog').hide();
    console.log("hide package dialog.");
    $('.button.green').show();
  }
  else {
    var canClose = true;
    for(var i in packageCodes) {
      var k = packageCodes[i];
      if($('#ic' + k).val() == k) {
        $('#ic' + k).hide();
        $('#li' + k).append('<i class="fa fa-check margin-right-m"></i>')
      }
      else {
        console.log("ic" + k + " does not match with " + k);
        $('#ic' + k).val('?');
        canClose = false;
      }
    }
    if(canClose) {
      $('#mhtPackageDialog').hide();
      $('.button.green').show();
      console.log("hide package dialog.");
    }  
  }
}


</script>
`;

var handoverscript  = ` 
<script>

var packageCodes = [];
var replacedHtml = '';

$(document).ready(function(){
  console.log("hand over proxy script at work.");
  $('.button.green').click(function() {
    setTimeout(function() {
    $('.button.green').hide();
    replacedHtml = $('.padding-bottom-m.margin-bottom-m.no-last-child-margin').html();
   // $('.row.margin-top-s.padding-horizontal-l').append();
   $('.padding-bottom-m.margin-bottom-m.no-last-child-margin').html('<form id="packageForm"><ul id="mht_package_list"></ul><button type="button" style="margin-top:20px" onClick="checkPackageCodes();">Check & Close</button></form>');
    $("input[id^=assigned-item-]").each(function(i, obj) {
      var item_id = $(obj).val();
      
      if(item_id.length > 0) {
          $.get( "/mht_get_package_children?id=" + item_id, function( data ) {
        console.log("Result for item " + item_id + ": " + JSON.stringify(data));

        // example: [{"inventory_code":"2","model_id":2,"product":"ModelB"},{"inventory_code":"1","model_id":1,"product":"ModelA"}] hand_over:741:9

        // row margin-top-s padding-horizontal-l
        
        for(var k in data) {
          $('#mht_package_list').append('<li id="li' + data[k].inventory_code + '">' + data[k].product + '<input type="text" id="ic' + data[k].inventory_code + '"></input></li>');        
          packageCodes.push(data[k].inventory_code);
        }
       });
      }   
    });

    // div aria-hidden="false" class="modal fade ui-modal medium in ui-shown" 

    $("div.modal.fade.ui-modal.medium.in.ui-shown").on('hidden.bs.modal', function (e) {
       closedModal();
      });  
      $("div.modal-close").click(function() {
        closedModal();
      });
    }, 1000);
  });
  $("input[id^=assigned-item-]").each(function(i, obj) {
    console.log("found item: " + obj + " value: " + $(obj).val());
  });
});

function restoreHtml() {
   $('.padding-bottom-m.margin-bottom-m.no-last-child-margin').html(replacedHtml);
}
function closedModal() {
 console.log("closed modal!");
 packageCodes = []; //reset 
 restoreHtml();
 $('.button.green').show();
}

function checkPackageCodes() {
  if(packageCodes.length == 0) {
    restoreHtml();
    $('.button.green').show();
  }
  else {
    var canClose = true;
    for(var i in packageCodes) {
      var k = packageCodes[i];
      if($('#ic' + k).val() == k) {
        $('#ic' + k).hide();
        $('#li' + k).append('<i class="fa fa-check margin-right-m"></i>')
      }
      else {
        console.log("ic" + k + " does not match with " + k);
        $('#ic' + k).val('?');
        canClose = false;
      }
    }
    if(canClose) {
      restoreHtml();
      $('.button.green').show();
    }  
  }
}

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

simpleselect_handover.query = 'body';
simpleselect_handover.func = function(node) {
    var rs = node.createReadStream();
  var ws = node.createWriteStream({outer: false});

  rs.pipe(ws, {end: false});

  
  
  // When the read stream has ended, attach our style to the end
  rs.on('end', function(){
    ws.end(handoverscript);
  });
    
}

selects.push(simpleselect);
selects2.push(simpleselect_handover);

var only = function(middleware) {
    return function(req, res, next) {
      var tmp = req.path.split('/');
      var endswith = tmp.pop();
      if((endswith == 'take_back') && (req.method == 'GET')) {
        return middleware(req, res, next);
      }
      else {
        return next();
      }
    };
};
var only2 = function(middleware) {
    return function(req, res, next) {
      var tmp = req.path.split('/');
      var endswith = tmp.pop();
      if((endswith == 'hand_over') && (req.method == 'GET')) {
        return middleware(req, res, next);
      }
      else {
        return next();
      }
    };
};

var harmon = require('harmon-binary')([], selects);
var harmon2 = require('harmon-binary')([], selects2);

app.use(only(harmon)); //take back
app.use(only2(harmon2)); //hand over

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
        var query2 = "SELECT inventory_code, model_id FROM items WHERE parent_id = " + connection.escape(package_id) + ";";
          connection.query(query2, function (err, rows, fields) {
            
            if(err) {
              console.log("mysql error: " + err);
              res.writeHead(200, {"Content-Type": "application/json"}); 
              res.end(JSON.stringify([]));
            }
            else {
              var id_list = [];
              for(var k in rows) {
                id_list.push({inventory_code : rows[k].inventory_code, model_id : rows[k].model_id});                
              }
              productChain(id_list, [], res);
            }
          });
      }
    }
  });
  
 
});

function productChain(id_list, result_list, res) {
  if(id_list.length == 0) { //done
    res.writeHead(200, {"Content-Type": "application/json"}); 
    res.end(JSON.stringify(result_list));
  }
  else {
    var idItem = id_list.pop();
    var query = "SELECT product FROM models WHERE id = " + connection.escape(idItem.model_id) + " LIMIT 1;";
    connection.query(query, function(err, rows, fields) {
      if((err) || (rows.length == 0)) {
        console.log("mysql error: " + err);
        res.writeHead(200, {"Content-Type": "application/json"}); 
        res.end(JSON.stringify([]));
      }
      else {
        idItem.product = rows[0].product;
        result_list.push(idItem);
        productChain(id_list, result_list, res);
      }
    });
  }
}

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

