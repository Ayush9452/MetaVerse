import { Router } from "express";
import { adminMiddleware } from "../../middleware/admin";
import { CreateAvatarSchema, CreateElementSchema, CreateMapSchema, UpdateElementSchema } from "../../types";
import client from "@repo/db/client";
const adminRouter = Router();



adminRouter.post("/element",adminMiddleware, async (req,res)=>{
    const parshedData = CreateElementSchema.safeParse(req.body);
    if(!parshedData.success){
        res.status(400).json({message :"Invalid data passed"});
        return;
    }   

    const element = await client.element.create({
        data: {
            imageUrl: parshedData.data.imageUrl,
            width: parshedData.data.width,
            height: parshedData.data.height,
            static: parshedData.data.static,
        }
    })

    res.status(200).json({id : element.id});
})

adminRouter.put("/element/:elementId",adminMiddleware, async (req,res)=>{
    const elementId = req.params.elementId;
    const element = await client.element.findUnique({
        where: {
            id: elementId
        }
    })
    if(!element){
        res.status(400).json({message :"Invalid element id passed"});
        return;
    }

    const parshedData = UpdateElementSchema.safeParse(req.body);
    if(!parshedData.success){
        res.status(400).json({message :"Invalid data passed"});
        return;
    }   

    await client.element.update({
        where: {
            id: elementId
        },
        data: {
            imageUrl: parshedData.data.imageUrl,
        }
    })
    res.status(200).json({message :"Element updated"});
})

adminRouter.post("/avatar",adminMiddleware, async (req,res)=>{
    const parshedData = CreateAvatarSchema.safeParse(req.body);
    if(!parshedData.success){
        res.status(400).json({message :"Invalid data passed"});
        return;
    }   

    const avatar = await client.avatar.create({
        data: {
            name: parshedData.data.name,
            imageUrl: parshedData.data.imageUrl,
        }
    })
    res.status(200).json({avatarId : avatar.id});
})

adminRouter.post("/map",adminMiddleware, async (req,res)=>{
    const parshedData = CreateMapSchema.safeParse(req.body);
    if(!parshedData.success){
        res.status(400).json({message :"Invalid data passed"});
        return;
    }   

    const map = await client.map.create({
        data: {
            name: parshedData.data.name,
            width: parseInt(parshedData.data.dimensions.split("x")[0]),
            height: parseInt(parshedData.data.dimensions.split("x")[1]),
            thumbnail: parshedData.data.thumbnail,
            mapElements: {
                create: parshedData.data.defaultElements.map(e => ({
                    elementId: e.elementId,
                    x: e.x,
                    y: e.y,
                }))
            }
        }
    })
 
    res.status(200).json({id : map.id});
})


export default adminRouter;