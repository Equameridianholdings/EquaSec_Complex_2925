import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { visitorDTO } from '../interfaces/visitorDTO';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
 
  private socket: Socket;

  constructor() {
    this.socket = io(environment.SOCKET_URI);
  }

  newVisitor() {
    this.socket.emit('visitors', "new visitor added");
  }

  getVisitors(callback: () => void) {
    this.socket.on('visitors', callback);
  }
}
