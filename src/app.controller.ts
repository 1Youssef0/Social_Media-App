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
import {
  BadRequestException,
  globalErrorHandling,
} from "./utils/response/error.response";
import connectDB from "./DB/db.connection";
import {
  createGetPreSignedLink,
  deleteFile,
  getFile,
} from "./utils/multer/s3.config";
import { promisify } from "node:util";
import { pipeline } from "node:stream";
import { authRouter, postRouter, userRouter } from "./modules";
import { createHandler } from "graphql-http/lib/use/express";
import { schema } from "./modules/graphQL/schema.gql";
import { authentication } from "./middleware/authentication.middleware";
const createS3WriteStreamPipe = promisify(pipeline);

//Handle base rate limit on all api requests
const limiter = rateLimit({
  windowMs: 60 * 60000,
  limit: 2000,
  message: { error: "Too Many Requests ,Please Try Again Later ❌❌" },
  statusCode: 429,
});

const bootstrap = async (): Promise<void> => {
  //App-start-point
  const app: Express = express();
  const port: number | string = process.env.PORT || 5000;

  //Global application middleware
  app.use(cors());
  app.use(express.json());
  app.use(helmet());
  app.use(limiter);

  //Connecting to DB
  await connectDB();

  // App_Routing

  app.all(
    "/graphQL",
    authentication(),
    createHandler({
      schema: schema,
      context: (req) => ({ user: req.raw.user }),
    })
  );

  app.get("/welcome", (req: Request, res: Response) => {
    res.json({ message: "welcome to social app backend landing page 💖✔" });
  });

  //Sub-app-routing-modules
  app.use("/auth", authRouter);
  app.use("/user", userRouter);
  app.use("/post", postRouter);

  app.get(
    "/upload/*path",
    async (req: Request, res: Response): Promise<void> => {
      const { downloadName, download = "false" } = req.query as {
        downloadName?: string;
        download?: string;
      };
      const { path } = req.params as unknown as { path: string[] };
      const Key = path.join("/");
      const s3Response = await getFile({ Key });
      if (!s3Response.Body) {
        throw new BadRequestException("failed to fetch this asset");
      }

      res.setHeader(
        "content-type",
        `${s3Response.ContentType || "application/octet-stream"}`
      );

      if (download === "true") {
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${downloadName || Key.split("/").pop()}"`
        );
      }

      return await createS3WriteStreamPipe(
        s3Response.Body as NodeJS.ReadableStream,
        res
      );
    }
  );

  app.get(
    "/upload/pre-signed/*path",
    async (req: Request, res: Response): Promise<Response> => {
      const {
        downloadName,
        download = "false",
        expiresIn = 120,
      } = req.query as {
        downloadName?: string;
        download?: string;
        expiresIn?: number;
      };
      const { path } = req.params as unknown as { path: string[] };
      const Key = path.join("/");
      const url = await createGetPreSignedLink({
        Key,
        downloadName: downloadName as string,
        download,
        expiresIn,
      });
      return res.json({ message: "done", data: { url } });
    }
  );

  app.get("/test-delete", async (req: Request, res: Response) => {
    const { Key } = req.query as { Key: string };
    const result = await deleteFile({ Key });

    // const result = await deleteFiles({
    //   urls:[
    //     "",
    //     ""
    //   ]
    // })
    return res.json({ message: "Done", data: { result } });
  });

  //In-Valid routing
  app.use("{/*dummy}", (req, res) => {
    return res.status(404).json({
      message: "InValid Routing ,Please check your Url and the method 😢",
    });
  });

  //Global error handling
  app.use(globalErrorHandling);

  //run server
  app.listen(port, () => {
    console.log(`Server is running on port ::: ${port} 🚀`);
  });
};

export default bootstrap;
