import { WebSocket } from "ws";
import client from "@repo/db/client";
import { RoomManager } from "./RoomManager";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "./congif";
import { OutgoingMessage } from "./types";



function getRandomString(length: number) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}



export class User {
    public id: string;
    public userId?: string;
    private spaceId?: string;
    private x: number;
    private y: number;
    private ws: WebSocket;


    constructor(ws: WebSocket) {
        this.id = getRandomString(10);
        this.ws = ws;
        this.x = 0;
        this.y = 0;
        this.initHander();
    }

    initHander() {
        this.ws.on("message", async (data) => {
            const parsedData = JSON.parse(data.toString());
            switch (parsedData.type) {
                case "join":
                    const spaceId = parsedData.payload.spaceId;
                    const token = parsedData.payload.token;
                    const userId = (jwt.verify(token, JWT_SECRET) as JwtPayload).userId;
                    if (!userId) {
                        this.ws.close();
                        return;
                    }
                    this.userId = userId;

                    const space = await client.space.findFirst({
                        where: {
                            id: spaceId
                        }
                    });
                    if (!space) {
                        this.ws.close();
                        return;
                    }
                    this.spaceId = spaceId;

                    RoomManager.getInstance().addUser(spaceId, this);
                    this.x = Math.floor(Math.random() * space?.width);
                    this.y = Math.floor(Math.random() * space?.height);
                    this.send({
                        type: "space-joined",
                        payload: {
                            spawn: {
                                x: this.x,
                                y: this.y
                            },
                            users: RoomManager.getInstance().rooms.get(spaceId)?.filter(x => x.id !== this.id)?.map(u => ({id: u.id})) ?? []
                        }
                    })
                    RoomManager.getInstance().broadcast({
                        type: "user-joined",
                        payload: {
                            x: this.x,
                            y: this.y,
                            userId: this.userId
                        }
                    }, this, this.spaceId!);
                    break;
                case "move":
                    const moveX = parsedData.payload.x;
                    const moveY = parsedData.payload.y;
                    const xdisplacement = Math.abs(moveX - this.x);
                    const ydisplacement = Math.abs(moveY - this.y);
                    if (xdisplacement + ydisplacement === 1) {
                        this.x = moveX;
                        this.y = moveY;
                        RoomManager.getInstance().broadcast({
                            type: "movement",
                            payload: {
                                x: this.x,
                                y: this.y
                            }
                        }, this, this.spaceId!);
                        return;
                    }

                    this.send({
                        type: "movement-rejected",
                        payload: {
                            x: this.x,
                            y: this.y
                        }
                    });
                    break;
            }

        });

    }

    destroy() {
        RoomManager.getInstance().broadcast({
            type: "user-left",
            payload: {
                userId: this.userId
            }
        }, this, this.spaceId!);
        RoomManager.getInstance().removeUser(this, this.spaceId!);
    }

    send(message: OutgoingMessage) {
        this.ws.send(JSON.stringify(message));
    }
};