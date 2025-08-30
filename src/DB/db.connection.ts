import mongoose from "mongoose";
import { UserModel } from "./models/user.model";

const connectDB = async (): Promise<void>=>{
    try {
        const uri = process.env.DB_URI
         await mongoose.connect(uri as string)
        console.log("DB is connected");
        // console.log(result);
        await UserModel.syncIndexes();
    } catch (error) {
    console.log(" failed to connect", error);
    }
}


export default connectDB;
 