//core-modules
import { resolve } from "node:path";

//Load express & type_express
import type { Request, Express, Response } from "express";
import express from "express";

//third-party modules
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
//Setup ENV
import { config } from "dotenv";
config({ path: resolve("./config/.env.development") });

//module routing
import authController from "./modules/auth/auth.controller";
import { globalErrorHandling } from "./utils/response/error.response";
import connectDB from "./DB/db.connection";

//Handle base rate limit on all api requests
const limiter = rateLimit({
  windowMs: 60 * 60000,
  limit: 2000,
  message: { error: "Too Many Requests ,Please Try Again Later ❌❌" },
  statusCode: 429,
});

const bootstrap = async (): Promise<void>=> {
  //App-start-point
  const app: Express = express();
  const port: number | string = process.env.PORT || 5000;

  //Global application middleware
  app.use(cors());
  app.use(express.json());
  app.use(helmet());
  app.use(limiter);

  //Connecting to DB
    await connectDB()


  // App_Routing
  app.get("/", (req: Request, res: Response) => {
    res.json({ message: "welcome to social app backend landing page 💖✔" });
  });

  //Sub-app-routing-modules
  app.use("/auth", authController);

  //In-Valid routing
  app.use("{/*dummy}", (req, res) => {
    return res.status(404).json({message: "InValid Routing ,Please check your Url and the method 😢"});
  });

  //Global error handling
  app.use(globalErrorHandling);

  //run server
  app.listen(port, () => {
    console.log(`Server is running on port ::: ${port} 🚀`);
  });
};

export default bootstrap;
