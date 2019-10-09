var app = require('express')();
var http = require('http').Server(app);
//var io = require('socket.io')(http);
var io = require('socket.io')(http, {pingTimeout: 30000})
var port = process.env.PORT || 3000;
const axios = require('axios');
const GET_USER_API = 'http://localhost:8080/api/v1/tokens/user_info'
const SOCKET_CHANNEL_AUTH = 'http://localhost:8080/api/v1/cars/socket_auth'

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
}); 

var redis = require('redis').createClient();
redis.subscribe('chatroom')

//This function only works after auth
redis.on('message', function(channel, message){
  message = JSON.parse(message);
  io.to(`${message.tractable_device_id}`).emit('location', message);
});

async function authenticateToRails(cred){
  let user = null;

  await axios.get(GET_USER_API,{
    headers: {"Authorization" : `Bearer ${cred}`}
  }).then(response => {
    user = response.data.user;
  }).catch(error => {
    console.log(error);
  })

  return user;
}

async function authenticateRoom(user,room){
  let authenticated = null;

  await axios.post(SOCKET_CHANNEL_AUTH,{car: {room: room}},{
    headers: {"Authorization" : `Bearer ${user.cred}`}
  }).then(response => {
    authenticated = response.data;
  }).catch(error => {
    console.log(error);
  })

  return authenticated;
}

require('socketio-auth')(io, {
  authenticate: function (socket, data, callback) {
    //get credentials sent by the client
    var auth = data.token;

    //inform the callback of auth success/failure
    authenticateToRails(auth).then((user) => {
      socket.client.user = {...user, cred: auth}
      if (user !== null){
        return callback(null, user !== null);
      }else{
        return callback(new Error("User not found"));
      }
    })
  },
  postAuthenticate: function(socket,data){
    var room = data.room;
    //Authenticate before join other room
    authenticateRoom(socket.client.user,room).then((response) => {
      if(response.status === "ok"){
        socket.join(room);
      }else{
        socket.emit('err',`Not permitted to join room ${room}, ${response.message}`)
      }
    })
  }
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
