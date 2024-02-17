const http = require('http');
const { Server } = require('socket.io');
const UserManager = require('./managers/userManager');

const server = http.createServer();
const io = new Server(server,{
    cors: {
      origin: "*"
    }
  });

const userManager = new UserManager();

io.on('connection', (socket) => {
  console.log('A user connected');
  // userList.push(socket);
  // console.log(socket.id);
  socket.on('joined',(name)=>{
    console.log('user joined '+ name);
    userManager.addUser(socket,name);
  })
  socket.on('disconnect', () => {
    userManager.removeUser(socket.id);
    console.log('User disconnected');
  });
});
const PORT = 9096;

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
