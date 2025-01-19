import { Router } from "express";
import { userMiddleware } from "../../middleware/user";
import { AddElementSchema, CreateSpaceSchema, DeleteElementSchema } from "../../types";
import client from "@repo/db/client";


const spaceRouter = Router();


//space dashboard
spaceRouter.get("/all", userMiddleware, async (req, res) => {
    const userId = req.userId;
    const spaces = await client.space.findMany({
        where: {
            creatorId: userId
        },
        select: {
            id: true,
            name: true,
            width: true,
            height: true,
            thumbnail: true,
        }
    })
    res.json({
        spaces: spaces.map(s => ({
            spaceId: s.id,
            name: s.name,
            thumbnail: s.thumbnail,
            dimensions: `${s.width}x${s.height}`,
        }))
    });
})

// Arena
spaceRouter.get("/:spaceId", userMiddleware, async (req, res) => {
    const spaceId = req.params.spaceId;
    const space = await client.space.findFirst({
        where: {
            id: spaceId
        },include: {
            elements: {
                include: {
                    element: true
                }
            },
        }
    })

    if (!space) {
        res.status(400).json({ message: "Invalid space id passed" });
        return;
    }
    res.json({
        dimensions: `${space.width}x${space.height}`,
        elements: space.elements.map(e => ({
            id: e.id,
            x: e.x,
            y: e.y,
            elements: {
                id: e.element.id,
                imageUrl: e.element.imageUrl,
                width: e.element.width,
                height: e.element.height,
                static: e.element.static,
            }
        }))
    });
})

spaceRouter.post("/element", userMiddleware, async (req, res) => {
    const parsedData = AddElementSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ message: "Invalid data passed" });
        return;
    }
    const space = await client.space.findUnique({
        where: {
            id: parsedData.data.spaceId,
            creatorId: req.userId
        },
        select: {
            width: true,
            height: true,
        }
    })

    if (!space) {
        res.status(400).json({ message: "Invalid space id passed" });
        return;
    }

    if(space.width < parsedData.data.x || space.height < parsedData.data.y || parsedData.data.x < 0 || parsedData.data.y < 0){
        res.status(400).json({ message: "Invalid coordinates passed" });
        return;
    }

    await client.spaceElements.create({
        data: {
            spaceId: parsedData.data.spaceId,
            elementId: parsedData.data.elementId,
            x: parsedData.data.x,
            y: parsedData.data.y,
        }
    })
    res.status(200).json({ message: "Element added" });
})

spaceRouter.delete("/element", userMiddleware, async (req, res) => {
    const parsedData = DeleteElementSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ message: "Invalid data passed" });
        return;
    }

    const spaceElement = await client.spaceElements.findFirst({
        where: {
            id: parsedData.data.id,
        },
        include: {
            space: true,
        }
    })

    if (!spaceElement || spaceElement.space.creatorId !== req.userId) {
        res.status(403).json({ message: "Not allowed" });
        return;
    }

    await client.spaceElements.delete({
        where: {
            id: parsedData.data.id
        }
    })
    res.status(200).json({ message: "Element deleted" });
})

//space dashboard
spaceRouter.post("/", userMiddleware, async (req, res) => {
    const parsedData = CreateSpaceSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ message: "Invalid data passed" });
        return;
    }

    if (!parsedData.data.mapId) {
        try {
            const space = await client.space.create({
                data: {
                    name: parsedData.data.name,
                    width: parseInt(parsedData.data.dimensions.split("x")[0]),
                    height: parseInt(parsedData.data.dimensions.split("x")[1]),
                    creatorId: req.userId!,
                }
            })
            res.json({
                spaceId: space.id,
            });
        } catch (error) {
            res.status(400).json({ message: "Somthing went wrong" });
        }
    } else {
        try {
            const mapToCreate = await client.map.findFirst({
                where: {
                    id: parsedData.data.mapId
                },
                select: {
                    mapElements: true,
                    width: true,
                    height: true,
                    thumbnail: true,
                }
            })
            if (!mapToCreate) {
                res.status(400).json({ message: "Invalid map id passed" });
                return;
            }

            let space = await client.$transaction(async () => {
                const space = await client.space.create({
                    data: {
                        name: parsedData.data.name,
                        height: mapToCreate.height,
                        width: mapToCreate.width,
                        thumbnail: mapToCreate.thumbnail,
                        creatorId: req.userId!,
                    }
                })
                await client.spaceElements.createMany({
                    data: mapToCreate.mapElements.map(e => ({
                        spaceId: space.id,
                        elementId: e.elementId,
                        x: Number(e.x),
                        y: Number(e.y),
                    }))
                })

                return space;
            })
            res.json({
                spaceId: space.id,
            });
        } catch (error) {
            res.status(400).json({ message: "Somthing went wrong" });
        }
    }
})

spaceRouter.delete("/:spaceId", userMiddleware, async (req, res) => {
    const spaceId = req.params.spaceId;
    const space = await client.space.findUnique({
        where: {
            id: spaceId
        }, select: {
            creatorId: true,
        }
    })
    if (!space) {
        res.status(400).json({ message: "Invalid space id passed" });
        return;
    }

    if (space.creatorId !== req.userId) {
        res.status(403).json({ message: "Not allowed" });
        return;
    }

    await client.spaceElements.deleteMany({
        where: {
            spaceId: spaceId
        }
    })

    await client.space.delete({
        where: {
            id: spaceId
        }
    })
    res.status(200).json({ message: "Space deleted" });
})

export default spaceRouter;