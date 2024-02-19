const uniqid = require('uniqid');
function Room(user1,user2,roomId){
    this.id= socket.id;
    this.socket=socket;
    this.name=socket.name
  }
  
  module.exports = function RoomManager(){
      this.rooms = new Map();
      this.createRoom = function (user1,user2){
        const roomId = uniqid('room_');
        this.rooms.set(roomId, {
            user1, 
            user2,
        })
        console.log("creating room and triggering send offer for both users",user1.socket.id,user2.socket.id);
        user1.socket.emit("send-offer", {
            roomId
        })

        user2.socket.emit("send-offer", {
            roomId
        })
      }
      function removeRoom(roomId){
          rooms.delete(roomId);
      }

      this.onOffer = function (roomId, sdp, senderSocketid) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }
        const receivingUser = room.user1.socket.id === senderSocketid ? room.user2: room.user1;
        console.log("asked receiving user to send offer to start another webRTC connection")
        receivingUser?.socket.emit("offer", {
            sdp,
            roomId
        })
    }
    
    this.onAnswer = function(roomId, sdp, senderSocketid) {
        console.log("got answer from sending user");
        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }
        const receivingUser = room.user1.socket.id === senderSocketid ? room.user2: room.user1;

        console.log("sending answer to receiving user");
        receivingUser?.socket.emit("answer", {
            sdp,
            roomId
        });
    }

    this.onAddIceCandidates = function (roomId, senderSocketid, candidate, type) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }
        const receivingUser = room.user1.socket.id === senderSocketid ? room.user2: room.user1;
        receivingUser.socket.emit("add-ice-candidate", ({candidate, type}));
    }
  }