import mongoose from "mongoose";

const connectDB = async (): Promise<void>=>{
    try {
        const uri:any = process.env.DB_URI
         await mongoose.connect(uri)
        console.log("DB is connected");
        // console.log(result);
        
    } catch (error) {
    console.log(" failed to connect", error);
    }
}


export default connectDB;
 