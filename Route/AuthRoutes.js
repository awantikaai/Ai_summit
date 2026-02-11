import { Router } from "express";
import { authMiddleware } from "../Middleware/Apikey.js";
import { HoneyPot } from "../Controller/Honey-pot.js";
import { honey_pot } from "../Controller/newhoney-pot.js";

const router = Router()

router.post("/honeypot" , authMiddleware , honey_pot )
router.get("/honeypot" , authMiddleware , HoneyPot )

export default router;