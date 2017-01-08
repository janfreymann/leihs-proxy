# leihs-proxy
Leihs proxy / MH Trossingen prototype

used to check package contents during hand over and take back. All barcodes of package child items must be scanned.

## Installation

sudo apt-get install nodejs

`git clone https://github.com/janfreymann/leihs-proxy/`

`cd leihs-proxy`

`npm install`

Edit config.js and enter Mysql user, password and database. Enter correct URL (including port) for SERVER_LEIHS.

Configure reverse-proxy (for instance, nginx) to listen on port 8888 (or the port number entered in config.js for PROXY_PORT).

Test server with 

`node index.js`

Use a node process manager to run index.js in production environments. We recommend http://pm2.keymetrics.io/
