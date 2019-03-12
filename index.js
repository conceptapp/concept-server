// app.js
var express    = require('express');
var app        = express();
var cors = require('cors');
var bodyParser = require('body-parser');
// var morgan     = require('morgan');
var port       = process.env.PORT || 5000; 

// Attaching socket.io
var server = require('http').createServer(app);
var io = require('socket.io')(server);
// io.on('connection', client => {
// 	client.on('event', data => { console.log(data) })
// 	client.on('disconnect'), () => { console.log("client disconnected") }
// })
io.on('connection', (socket) => {
	console.log("client connected")

	socket.on('message', (data) => {
		console.log(data)
		io.sockets.emit('message', data)
	})
})
app.set('socketio', io); 
app.set('server', server);
var whitelist = ['https://concept-35ade.firebaseapp.com', 'localhost:8080'];
var corsOptions = {
 origin: function(origin, callback){
   var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
   callback(null, originIsWhitelisted);
 }
};

app.use(cors(corsOptions));

// configure body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('server').listen(port);


// // --------------------------------------------------------------- //
// // server.js
// // load the server resource and route GET method
// const server = require('server')

// // const { get } = require('server/router')
// const { get, socket } = require('server/router')

// // get server port from environment or default to 3000
// const port = process.env.PORT || 5000

// server({ port }, [
//   get('/', ctx => '<h1>Hello you!</h1>'),
//   socket('message', ctx => {
//     // Send the message to every socket
//     console.log("got message: ", ctx.data)
//     ctx.io.emit('message', ctx.data)
//   }),
//   socket('connect', ctx => {
//     console.log('client connected', Object.keys(ctx.io.sockets.sockets))
//     ctx.io.emit('count', {msg: 'HI U', count: Object.keys(ctx.io.sockets.sockets).length})
//   })
// ])
//   .then(() => console.log(`Server running at http://localhost:${port}`))


// --------------------------------------------------------------- //
// // attempt with https://stackoverflow.com/questions/20093070/unable-to-create-cross-domain-websocket-connection-to-node-js-socket-io-server
// app = require('express')();

// app.use(function(req, res, next) {
//   res.header('Access-Control-Allow-Origin', '*');
//   res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
//   res.header('Access-Control-Allow-Headers', 'Content-Type');
//   return next();
// });


// //HTTP Server 
// var express=require('express');
// //Express instance
// var app = express();

// //ENABLE CORS
// app.all('/', function(req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Headers", "X-Requested-With");
//   next();
//  });


// const cool = require('cool-ascii-faces')
// const express = require('express')
// const path = require('path')
// const PORT = process.env.PORT || 5000

// express()
//   .use(express.static(path.join(__dirname, 'public')))
//   .set('views', path.join(__dirname, 'views'))
//   .set('view engine', 'ejs')
//   .get('/', (req, res) => res.render('pages/index'))
//   .get('/cool', (req, res) => res.send(cool()))
//   .listen(PORT, () => console.log(`Listening on ${ PORT }`))
