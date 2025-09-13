import mongoose, { Schema, Types, HydratedDocument } from "mongoose";
import { generateHash } from "../../utils/security/hash.security";
import { emailEvent } from "../../utils/events/email.events";

export enum genderEnum {
  male = "male",
  female = "female",
}

export enum roleEnum {
  user = "user",
  admin = "admin",
}

export enum providerEnum {
  GOOGLE = "GOOGLE",
  SYSTEM = "SYSTEM",
}

export interface IUser {
  _id: Types.ObjectId;

  //name
  firstName: string;
  lastName: string;
  userName?: string;
  // email
  email: string;
  confirmEmailOtp?: string;
  confirmedAt?: Date;
  //password
  password: string;
  resetPasswordOtp: string;
  changeCredentialsTime?: Date;

  phone: string;
  address?: string;
  profileImage?: string;
  temProfileImage?: string;
  coverImages?: string[];

  gender: genderEnum;
  role: roleEnum;
  provider: providerEnum;

  createAt: Date;
  updatedAt?: Date;

  freezedAt?: Date;
  freezedBy?: Types.ObjectId;

  restoredAt?: Date;
  restoredBy?: Types.ObjectId;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, minLength: 2, maxLength: 25 },
    lastName: { type: String, required: true, minLength: 2, maxLength: 25 },
    // email
    email: { type: String, required: true, unique: true },
    confirmEmailOtp: { type: String },
    confirmedAt: { type: Date },
    //password
    password: {
      type: String,
      required: function () {
        return this.provider === providerEnum.GOOGLE ? false : true;
      },
    },
    resetPasswordOtp: { type: String },
    changeCredentialsTime: { type: Date },

    freezedAt: Date,
    freezedBy: { type: Schema.Types.ObjectId, ref: "User" },

    restoredAt: Date,
    restoredBy: { type: Schema.Types.ObjectId, ref: "User" },

    phone: { type: String },
    profileImage: { type: String },
    temProfileImage: { type: String },
    coverImages: [String],
    address: { type: String },
    gender: { type: String, enum: genderEnum, default: genderEnum.male },
    role: { type: String, enum: roleEnum, default: roleEnum.user },
    provider: {
      type: String,
      enum: providerEnum,
      default: providerEnum.SYSTEM,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema
  .virtual("userName")
  .set(function (value: string) {
    const [firstName, lastName] = value.split(" ") || [];
    this.set({ firstName, lastName });
  })
  .get(function () {
    return this.firstName + " " + this.lastName;
  });

userSchema.pre(
  "save",
  async function (
    this: HUserDocument & { wasNew: boolean; confirmEmailPlainOtp?: string },
    next
  ) {
    this.wasNew = this.isNew;
    if (this.isModified("password")) {
      this.password = await generateHash(this.password);
    }
    if (this.isModified("confirmEmailOtp")) {
      this.confirmEmailPlainOtp = this.confirmEmailOtp as string;
      this.confirmEmailOtp = await generateHash(this.confirmEmailOtp as string);
    }
    next();
  }
);

userSchema.post("save", async function (doc, next) {
  const that = this as HUserDocument & {
    wasNew: boolean;
    confirmEmailPlainOtp?: string;
  };
  if (that.wasNew && that.confirmEmailPlainOtp) {
    emailEvent.emit("confirmEmail", {
      to: this.email,
      html: that.confirmEmailPlainOtp,
    });
  }
  next();
});

userSchema.pre(["find", "findOne"], function (next) {
  const query = this.getQuery();
  if (query.paranoid === false) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ ...query, freezedAt: { $exists: false } });
  }
  
  next()
});

export const UserModel =
  mongoose.models.user || mongoose.model<IUser>("user", userSchema);

export type HUserDocument = HydratedDocument<IUser>;
