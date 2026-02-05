import { Router } from "express";
import { authMiddleware } from "../Middleware/Apikey.js";
import { HoneyPot } from "../Controller/Honey-pot.js";

const router = Router()

router.post("/honey-pot" , authMiddleware , HoneyPot )
router.get("/honey-pot" , authMiddleware , HoneyPot )

export default router;