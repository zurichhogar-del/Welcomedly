import {Router} from "express"

const router = Router();

router.get("/chat", (req, res) => res.render("chatViews/chat"));


export default router
