import { Router } from "express";
import { SigninSchema, SignupSchema, UpdatedMetaverseSchema } from "../../types";
import { compare, hash } from "../../script";
import client from "@repo/db/client";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../config";
import { userMiddleware } from "../../middleware/user";

const userRouter = Router();


userRouter.post("/signup",async (req,res)=>{
    const parsedData = SignupSchema.safeParse(req.body);
    // console.log(parsedData);

    if(!parsedData.success){
        res.status(400).json({message :"Invalid data passed"});
        return;
    }
    const hashedPassword = await hash(parsedData.data.password);
    try {
        const user = await client.user.create({
            data: {
                username: parsedData.data.username,
                password: hashedPassword,
                role: parsedData.data.type === 'admin' ? "Admin" : "User",
            }
        })
        res.json({
            userId: user.id,
        });
    } catch (error) {
        res.status(400).json({message :"Username already taken"});
    }
})

userRouter.post("/signin",async (req,res)=>{
    const parsedData = SigninSchema.safeParse(req.body);
    if(!parsedData.success){
        res.status(400).json({message :"Invalid data passed"});
        return;
    }

    try {
        const user = await client.user.findUnique({
            where: {
                username: parsedData.data.username,
            }
        })

        if(!user){
            res.status(403).json({message :"Invalid username or password"});
            return;
        }

        const isValid = await compare(parsedData.data.password,user.password);

        if(!isValid){
            res.status(403).json({message :"Invalid username or password"});
            return;
        }

        const token = jwt.sign({
                userId: user.id,
                role: user.role,
            },JWT_SECRET)

        res.json({
            token
        });
    } catch (error) {
        res.status(400).json({message :"Invalid username or password"});
    }
})

userRouter.post("/metadata", userMiddleware, async (req,res)=>{
    const parsedData = UpdatedMetaverseSchema.safeParse(req.body);
    if(!parsedData.success){
        res.status(400).json({message :"Invalid data passed"});
        return;
    }

    try {
        const userId = req.userId;
        const avatar = await client.avatar.findUnique({
            where: {
                id: parsedData.data.avatarId
            }
        })

        if(!avatar){
            res.status(400).json({message :"Invalid avatar id"});
            return;
        }

        await client.user.update({
            where: {
                id: userId
            },
            data: {
                avatarId: avatar.id
            }
        })

        res.status(200).json({message :"Avatar updated"});
    } catch (error) {
        res.status(400).json({message :"Invalid username or password"});
    }
})

userRouter.get("/metadata/bulk",async (req,res)=>{
    const userIdString = (req.query.ids ?? "[]") as string;
    const userIds = userIdString.slice(1, userIdString?.length - 1).split(",");

    const metaData = await client.user.findMany({
        where: {
            id: {
                in: userIds
            }
        },include: {
            avatar: true,
        }
    });
    res.status(200).json({
        avatars: metaData.map(m => ({
            userId: m.id,   
            avatarId: m.avatar?.imageUrl
        }))
    });
})


export default userRouter;