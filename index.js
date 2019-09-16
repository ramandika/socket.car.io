var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
}); 

var redis = require('redis').createClient();
redis.subscribe('chatroom')

//This function only works after auth
redis.on('message', function(channel, message){
  io.emit('chatroom', message)
  console.log(message)
});

require('socketio-auth')(io, {
  authenticate: function (socket, data, callback) {
    //get credentials sent by the client
    var username = data.username;
    var password = data.password;

    //inform the callback of auth success/failure
    if (username === "ramandika" && password === "pranamulia"){
      return callback(null, password == "pranamulia");
    }else{
      return callback(new Error("User not found"));
    }
  },
  postAuthenticate: function(socket, data){
    socket.client.user = data;
  }
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
