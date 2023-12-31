import { JwtService } from '@nestjs/jwt';
import { WebSocketGateway, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { IncomingHttpHeaders } from 'http';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: ["http://localhost:3000", process.env.ORIGIN as string], port: 8080, credentials: true } })
export class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() wss: Server;
    boards: Map<string, Array<{ userId: string, client: Socket }>> = new Map<string, Array<{ userId: string, client: Socket }>>();
    userBoardId: Map<string, string> = new Map<string, string>();

    processJWT(jwt: string): string {
        const data: { userId: string } = this.jwtService.verify(jwt);
        return data.userId;
    }

    afterInit(server: Server) { }
    constructor(private readonly jwtService: JwtService) { }

    handleDisconnect(@ConnectedSocket() client: Socket) {
        const jwt = client.handshake.query.jwt;
        if (typeof jwt !== 'string')
            return;

        const userId = this.processJWT(jwt);
        if (userId == null) return;

        let boardId = this.userBoardId.get(userId);
        if (boardId == null) return;
        this.userBoardId.delete(boardId);

        let usersInBoard = this.boards.get(boardId);
        if (usersInBoard == null) return;

        const ind = usersInBoard.findIndex(e => e.userId == userId);
        if (ind == -1) return;

        usersInBoard.splice(ind, 1);
        if (usersInBoard.length == 0)
            this.boards.delete(boardId);
        else
            this.boards.set(boardId, usersInBoard);
    }

    handleConnection(client: Socket, ...args: any[]) {
        const jwt = client.handshake.query.jwt;
        if (typeof jwt !== 'string')
            client.disconnect();
    }

    emitUpdateCards(boardId: string, sender: string) {
        const usersInBoard = this.boards.get(boardId);
        if (usersInBoard == null) return;
        for (let i = 0; i < usersInBoard.length; i++)
            usersInBoard[i].client.emit(boardId + "_UPDATE", { sender });
    }

    emitUpdateCard(boardId: string, cardId: string, section: string, sender: string) {
        const usersInBoard = this.boards.get(boardId);
        if (usersInBoard == null) return;
        for (let i = 0; i < usersInBoard.length; i++)
            usersInBoard[i].client.emit(cardId + "_UPDATE", { sender, section });
    }


    @SubscribeMessage('onBoardChange')
    handleEvent(@ConnectedSocket() client: Socket, @MessageBody() boardId: string) {

        const jwt = client.handshake.query.jwt;
        if (typeof jwt !== 'string') return;

        const userId = this.processJWT(jwt);
        if (userId == null) return;

        let previousBoardId = this.userBoardId.get(userId);
        this.userBoardId.set(userId, boardId); /* Ser User to userCurrentBoard */

        {
            /* Remove user from Previous Board */
            if (previousBoardId != null) {
                let usersInBoard = this.boards.get(previousBoardId);
                if (usersInBoard != null) {
                    let userIndex = usersInBoard.findIndex(e => e.userId === userId);

                    if (userIndex != -1) {
                        usersInBoard.splice(userIndex, 1);
                        this.boards.set(previousBoardId, usersInBoard);
                    }
                }
            }
        }

        {
            /* Add user to board */
            let usersInBoard = this.boards.get(boardId);
            if (usersInBoard == null) {
                usersInBoard = [{ userId: userId, client: client }];
                this.boards.set(boardId, usersInBoard);
            } else {
                if (!usersInBoard.some(e => e.userId === userId)) {
                    usersInBoard.push({ userId: userId, client: client });
                    this.boards.set(boardId, usersInBoard);
                }
            }
        }
    }

}