import { io } from 'socket.io-client';

let socketInstance = null;

const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:9096';

const createSocketInstance = () => {
  if (!socketInstance) {
    socketInstance = io(URL, {
      autoConnect: false
    });
  }
  return socketInstance;
};

export const socket = createSocketInstance();