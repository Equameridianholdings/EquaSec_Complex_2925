import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
 
  private socket: Socket;

  constructor() {
    this.socket = io(process.env["NG_APP_SOCKET_URI"]);
  }

  newVisitor() {
    this.socket.emit('visitors', "new visitor added");
  }

  getVisitors(callback: () => void) {
    this.socket.on('visitors', callback);
  }
}
