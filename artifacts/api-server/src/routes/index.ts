import { Router, type IRouter } from "express";
import healthRouter from "./health";
import qootRouter from "./qoot";

const router: IRouter = Router();

router.use(healthRouter);
router.use(qootRouter);

export default router;
