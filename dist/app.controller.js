"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = require("node:path");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = require("express-rate-limit");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)("./config/.env.development") });
const error_response_1 = require("./utils/response/error.response");
const db_connection_1 = __importDefault(require("./DB/db.connection"));
const s3_config_1 = require("./utils/multer/s3.config");
const node_util_1 = require("node:util");
const node_stream_1 = require("node:stream");
const modules_1 = require("./modules");
const createS3WriteStreamPipe = (0, node_util_1.promisify)(node_stream_1.pipeline);
const limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 60000,
    limit: 2000,
    message: { error: "Too Many Requests ,Please Try Again Later ❌❌" },
    statusCode: 429,
});
const bootstrap = async () => {
    const app = (0, express_1.default)();
    const port = process.env.PORT || 5000;
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use((0, helmet_1.default)());
    app.use(limiter);
    await (0, db_connection_1.default)();
    app.get("/", (req, res) => {
        res.json({ message: "welcome to social app backend landing page 💖✔" });
    });
    app.use("/auth", modules_1.authRouter);
    app.use("/user", modules_1.userRouter);
    app.use("/post", modules_1.postRouter);
    app.get("/upload/*path", async (req, res) => {
        const { downloadName, download = "false" } = req.query;
        const { path } = req.params;
        const Key = path.join("/");
        const s3Response = await (0, s3_config_1.getFile)({ Key });
        if (!s3Response.Body) {
            throw new error_response_1.BadRequestException("failed to fetch this asset");
        }
        res.setHeader("content-type", `${s3Response.ContentType || "application/octet-stream"}`);
        if (download === "true") {
            res.setHeader("Content-Disposition", `attachment; filename="${downloadName || Key.split("/").pop()}"`);
        }
        return await createS3WriteStreamPipe(s3Response.Body, res);
    });
    app.get("/upload/pre-signed/*path", async (req, res) => {
        const { downloadName, download = "false", expiresIn = 120, } = req.query;
        const { path } = req.params;
        const Key = path.join("/");
        const url = await (0, s3_config_1.createGetPreSignedLink)({
            Key,
            downloadName: downloadName,
            download,
            expiresIn
        });
        return res.json({ message: "done", data: { url } });
    });
    app.get("/test-delete", async (req, res) => {
        const { Key } = req.query;
        const result = await (0, s3_config_1.deleteFile)({ Key });
        return res.json({ message: "Done", data: { result } });
    });
    app.use("{/*dummy}", (req, res) => {
        return res.status(404).json({
            message: "InValid Routing ,Please check your Url and the method 😢",
        });
    });
    app.use(error_response_1.globalErrorHandling);
    app.listen(port, () => {
        console.log(`Server is running on port ::: ${port} 🚀`);
    });
};
exports.default = bootstrap;
