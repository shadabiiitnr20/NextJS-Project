import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/userModel";
import bcrypt from "bcryptjs";

import { sendVerificationEmail } from "@/utils/sendVerificationEmail";

export async function POST(request: Request) {
  await dbConnect();
  try {
    const { username, email, password } = await request.json();

    const ExistingUser_VerifiedByUsername = await UserModel.findOne({
      username,
      isVerified: true,
    });

    if (ExistingUser_VerifiedByUsername) {
      return Response.json(
        { success: false, message: "Username is already taken" },
        { status: 400 }
      );
    }

    const ExistingUser_VerifiedByEmail = await UserModel.findOne({ email });
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

    if (ExistingUser_VerifiedByEmail) {
      if (ExistingUser_VerifiedByEmail.isVerified) {
        return Response.json(
          {
            success: false,
            message: "User already exists with this email",
          },
          { status: 400 }
        );
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        ExistingUser_VerifiedByEmail.password = hashedPassword;
        ExistingUser_VerifiedByEmail.verifyCode = verifyCode;
        ExistingUser_VerifiedByEmail.verifyCodeExpiry = new Date(
          Date.now() + 3600000
        );
        await ExistingUser_VerifiedByEmail.save();
      }
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 1);
      const newUser = new UserModel({
        username,
        email,
        password: hashedPassword,
        verifyCode,
        verifyCodeExpiry: expiryDate,
        isVerified: false,
        isAcceptingMessage: true,
        messages: [],
      });

      await newUser.save();
    }

    //send verification mail

    const emailVerification = await sendVerificationEmail(
      email,
      username,
      verifyCode
    );

    if (!emailVerification.success) {
      return Response.json(
        { success: false, message: emailVerification.message },
        { status: 500 }
      );
    }

    return Response.json(
      {
        success: true,
        message: "User Registered Successfully. Please check your email",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error registering user", error);
    return Response.json(
      {
        success: false,
        message: "Error registering user",
      },
      {
        status: 500,
      }
    );
  }
}
