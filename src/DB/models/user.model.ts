import mongoose from "mongoose";

const userSchema : any = new mongoose.Schema(
    {
        userName:{
            type:String,
            minLength:2,
            maxLength:20,
            required:true
        },
        email:{
            type: String,
            unique: true,
            required: true,
        },
        password: {
            type: String,
            minLength:8,
            maxLength:25,
        },
    },{
        timestamps:true
    }
);
export const userModel = mongoose.models.user || mongoose.model("user",userSchema);

userModel.syncIndexes();
