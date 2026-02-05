import { Router } from "express";
import { authMiddleware } from "../Middleware/Apikey.js";
import { HoneyPot } from "../Controller/Honey-pot.js";

const router = Router()

router.post("/honeypot" , authMiddleware , HoneyPot )
router.get("/honeypot" , authMiddleware , HoneyPot )

export default router;