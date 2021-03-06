var express = require('express')
var app = express();
var httpProxy = require('http-proxy');
var leihsProxy = httpProxy.createProxyServer();
var config = require('./config');

var serverLeihs = config.SERVER_LEIHS;


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
var modal = '<div id="mhtPackageDialog" aria-hidden="false" class="modal fade ui-modal medium in ui-shown"><h2>Check package components:</h2><form id="packageForm" onsubmit="return false;"><input style=" border:solid 2px gray; margin-bottom: 10px;" id="check_barcode" value="" width=40><ul id="mht_package_list"></ul><button type="button" onClick="checkPackageCodes();">Check & Close</button></form></div>';

var showModal = false;

var packageCodes = [];
var parentIDs = {};

var itemVisible = {};

$(document).ready(function(){
    $( ".col2of10.line-col.text-align-center").each(function(i, obj) {
      var item_id = $(obj).children().first().text();
      //$(this).parent().find(":checkbox"); 
      
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
            $('#mht_package_list').append('<li id="li' + data[k].inventory_code + '">' + data[k].product + '</li>');        
            packageCodes.push(data[k].inventory_code);
            parentIDs[data[k].inventory_code] = item_id;
          }
          $("#packageForm").submit(function() {
              checkPackageCodes();
              return false; 
            });
        }   
      });
  });

  //check checkboxes periodically, update modal view:

  setInterval(function() {
    var willTakeBack = {};
    $( ".col2of10.line-col.text-align-center").each(function(i, obj) {
      var item_id = $(obj).children().first().text();
      willTakeBack[item_id] = $(this).parent().find(":checkbox").is(":checked");
    });

    for(var i  = 0; i < packageCodes.length; i++) {
      if(willTakeBack[parentIDs[packageCodes[i]]]) {
        $('#li' + packageCodes[i]).show();
        itemVisible[packageCodes[i]] = true;
      }
      else {
        $('#li' + packageCodes[i]).hide();
        itemVisible[packageCodes[i]] = false;
      }
    }
    checkPackageCodesAuto();
  }, 500)
});
function checkPackageCodesAuto() {
  if(packageCodes.length == 0) {
    $('#mhtPackageDialog').hide();
    $('.button.green').show();
  }
  else {
    canClose = true;
    if(packageCodes.length > 0) { //check if remaining package items are visible (will be borrowed)
      for(var i = 0; i < packageCodes.length; i++) {
        if(itemVisible[packageCodes[i]]) {          
           canClose = false; break; 
          }
      }
    }
    //else: canClose stays true


    if(canClose) {
      $('#mhtPackageDialog').hide();
      $('.button.green').show();
    }  
    else {
      $('#mhtPackageDialog').show();
      $('.button.green').hide();
    }
  }
}

function checkPackageCodes() {
  if(packageCodes.length == 0) {
    $('#mhtPackageDialog').hide();
    $('.button.green').show();
  }
  else {
    var canClose = true;
     var k = $("#check_barcode").val();
    if(typeof k == 'undefined') {
       $("#check_barcode").val("");
       return;
    }
    if($.inArray(k, packageCodes) != -1) {
       $('#li' + k).append('<i class="fa fa-check margin-right-m"></i> (' + k + ')');
       //remove element from array:
       for(var i = packageCodes.length - 1; i >= 0; i--) {
          if(packageCodes[i] == k) {
            packageCodes.splice(i, 1);
          }
       }
       $("#check_barcode").val("");
    }

    if(packageCodes.length > 0) { //check if remaining package items are visible (will be borrowed)
      for(var i = 0; i < packageCodes.length; i++) {
        if(itemVisible[packageCodes[i]]) {          
           canClose = false; break; 
          }
      }
    }
    //else: canClose stays true


    if(canClose) {
      $('#mhtPackageDialog').hide();
      $('.button.green').show();
    }  
    else {
      $('#mhtPackageDialog').show();
      $('.button.green').hide();
    }
  }
}


</script>
`;

var handoverscript  = ` 
<script>

var showModal = false;

var packageCodes = [];
var replacedHtml = '';

$(document).ready(function(){
  console.log("hand over proxy script at work.");
  $('.button.green').click(function() {
    setTimeout(function() {
    $("input[id^=assigned-item-]").each(function(i, obj) {

      //line row focus-hover-thin green
      var willBorrow= $(this).parent().parent().parent().find(":checkbox").is(":checked");

      if(willBorrow) { 
        var item_id = $(obj).val();
        console.log("will take back " + item_id + ": " + willBorrow);
        
        if(item_id.length > 0) {
            $.get( "/mht_get_package_children?id=" + item_id, function( data ) {
          console.log("Result for item " + item_id + ": " + JSON.stringify(data))

              
          for(var k in data) {
            if(!showModal) {
              showModal = true;
              $('.button.green').hide();
              replacedHtml = $('.padding-bottom-m.margin-bottom-m.no-last-child-margin').html();
              $('.padding-bottom-m.margin-bottom-m.no-last-child-margin').html('<form onsubmit="return false;" id="packageForm"><input style=" border:solid 2px gray; margin-bottom: 10px;" id="check_barcode" value="" width=40></input><ul id="mht_package_list"></ul><button type="button" style="margin-top:20px" onClick="checkPackageCodes();">Check & Close</button></form>');
            }

            $('#mht_package_list').append('<li id="li' + data[k].inventory_code + '">' + data[k].product + '</li>');        
            packageCodes.push(data[k].inventory_code);

            $("#packageForm").submit(function() {
              checkPackageCodes();
              return false; 
            });
          }
        

       });
       }
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
  if(showModal) {
    $('.padding-bottom-m.margin-bottom-m.no-last-child-margin').html(replacedHtml);
    showModal = false;
  }
   
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
    var k = $("#check_barcode").val();
    if(typeof k == 'undefined') {
       $("#check_barcode").val("");
       return;
    }
    if($.inArray(k, packageCodes) != -1) {
       $('#li' + k).append('<i class="fa fa-check margin-right-m"></i> (' + k + ')');
       //remove element from array:
       for(var i = packageCodes.length - 1; i >= 0; i--) {
          if(packageCodes[i] == k) {
            packageCodes.splice(i, 1);
          }
       }
       $("#check_barcode").val("");
       if(packageCodes.length > 0) canClose = false;
    }
    else {
      canClose = false;
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
       	 console.log("hand over URL detected.");
         return middleware(req, res, next);
      }
      else {
        return next();
      }
    };
};

var harmon = require('harmon')([], selects);
var harmon2 = require('harmon')([], selects2);

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

  leihsProxy.web(req, res, {target : serverLeihs});
});
//var bodyParser = require('body-parser')

app.listen(config.PROXY_PORT, function () {
  console.log('Leihs proxy app listening on port 8888!')
});

