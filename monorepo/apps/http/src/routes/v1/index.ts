import { Router } from "express";
import userRouter from "./userRoute";
import adminRouter from "./adminRoute";
import spaceRouter from "./spaceRoute";
import client from "@repo/db/client";

const router = Router();


router.get("/elements",async (req,res)=>{
    const elements = await client.element.findMany({})
    res.json({
        elements: elements.map(e => ({
            elementId: e.id,
            imageUrl: e.imageUrl,
            width: e.width,
            height: e.height,
            static: e.static,
        }))
    });
})

router.get("/avatars",async(req,res)=>{
    const avatars = await client.avatar.findMany({})
    res.json({
        avatars: avatars.map(a => ({
            avatarId: a.id,
            name: a.name,
            imageUrl: a.imageUrl,
        }))
    });
})


router.use("/user",userRouter)
router.use("/space",spaceRouter)
router.use("/admin",adminRouter)




export default router;