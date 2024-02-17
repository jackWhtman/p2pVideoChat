const RoomManager = require("./roomManager");

function User(socket,name){
  this.id= socket.id;
  this.socket=socket;
  this.name=name;
}

function UserManager() {
    this.userList = [];
    this.queue = [];
    this.roomManager = new RoomManager();
    this.addUser = function (socket, name) {
        this.userList.push(new User(socket, name));
        this.queue.push(socket.id);
        this.connectUsers();
    };
    this.removeUser = function (socketId) {
        this.userList = this.userList.filter(user => user.id !== socketId);
        this.queue = this.queue.filter(id => id !== socketId);
    };
    this.connectUsers = function () {
        console.log('quque length ' + this.queue.length);
        if (this.queue.length < 2) {
            return;
        }

        const id1 = this.queue.pop();
        const id2 = this.queue.pop();
        console.log("id is " + id1 + " " + id2);
        const user1 = this.userList.find(x => x.socket.id === id1);
        const user2 = this.userList.find(x => x.socket.id === id2);

        if (!user1 || !user2) {
            return;
        }

        const room = this.roomManager.createRoom(user1, user2);
        this.connectUsers();
    };

    this.initHandlers = function (socket) {
        socket.on("offer", ({sdp, roomId}) => {
            this.roomManager.onOffer(roomId, sdp, socket.id);
        })

        socket.on("answer",({sdp, roomId}) => {
            this.roomManager.onAnswer(roomId, sdp, socket.id);
        })

        socket.on("add-ice-candidate", ({candidate, roomId, type}) => {
            this.roomManager.onAddIceCandidates(roomId, socket.id, candidate, type);
        });
    }
}

module.exports = UserManager;