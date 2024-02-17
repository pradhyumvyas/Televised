import {asyncHandler} from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshTokens = async (userId) =>{
   try{
      console.log("userId",userId)
      const  user = await User.findById(userId);
      console.log("user",user)
      const accessToken = user.generateAccessToken();
      console.log("accessToken",accessToken)
      const refreshToken = user.generateRefreshToken();

      console.log("refreshToken",refreshToken)

      user.refreshToken = refreshToken;
      await user.save({validateBeforeSave:false});

      return {accessToken, refreshToken}

   } catch(e){
      throw new ApiError(500, "Error while generating tokens")
   }
}

const cookieResOptions = {
   httpOnly:true,
   // secure:true
}

// @desc    Register a new user
const registerUser = asyncHandler(async (req, res, next) => {
   /* 
      1) get user data from frontend
      2) validate user data - not empty
      3) check if user already exists in database: username and email
      4) check for images, check for avatar
      5) upload image to cloudinary, avatar
      6) create user object - create entry in database
      7) remove password and refresh tokens from user object
      8) check for user created or not
      9) return response to frontend
   */ 
  const {fullName, email, username, password} = req.body
  console.log("userdata",fullName, email, username, password);

  if(
      [fullName, email, username,password].some((field)=> field?.trim() === "")
  ){
      throw new ApiError(400, `${field} cannot be empty`)
  }

  const isUserAvailabe = await User.findOne({
      $or: [
          { username },
          { email}
      ]
  })

  if(isUserAvailabe){
      throw new ApiError(409, "User already exists with this username or email")
   }

   console.info("files", req.files);
   const avatar = req.files?.avatar ? req.files.avatar[0].path : null;
   const coverImage = req.files?.coverImage ? req.files.coverImage[0].path : null;

   if(!avatar){
      throw new ApiError(400, "Please upload avatar")
   }

   const avatarUpload = await uploadOnCloudinary(avatar)
   const coverImageUpload = await uploadOnCloudinary(coverImage)

   if(!avatarUpload){
      throw new ApiError(400, "Error while uploading avatar")
   }

   const user = await User.create({
      fullName,
      avatar: avatarUpload.url,
      coverImage: coverImageUpload?.url || null,
      email,
      username: username.toLowerCase(),
      password
   })

   const userCreated = await User.findById(user._id).select(
      "-password -refreshToken"
   )
   if(!userCreated){
      throw new ApiError(500, "Error while creating user")
   }

   return res.status(201).json(
      new ApiResponse(200, userCreated, "User created successfully")
   )
});

const loginUser = asyncHandler(async (req, res, next)=>{
   /*
      1) request body: username, password
      2) username or email
      3) check if user exists or not
      4) compare password
      5) generate access and refresh token
      6) send cookies to frontend
   */

      const {username,email, password} = req.body;
      console.log("userdata",username,email, password)

      if(!username && !email){
         throw new ApiError(400, "Username or email is required")
      }

      const user = await User.findOne({
         $or:[
            {username: username?.toLowerCase()},
            {email: email}
         ]
      })

      if(!user){
         throw new ApiError(404, "User not found")
      }

      const isPasswordCorrect = await user.isPasswordCorrect(password);

      if(!isPasswordCorrect){
         throw new ApiError(401, "Invalid credentials")
      }

      const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);

      const loggedInUser = await User.findById(user._id).select("-password -refreshToken"); //We can update above also instead of hit db again

      console.log("Cookies",accessToken, refreshToken)
      
      return res
      .status(200)
      .cookie("accessToken", accessToken, cookieResOptions)
      .cookie("refreshToken", refreshToken, cookieResOptions)
      .json(
         new ApiResponse(
            200, 
            {
               user: loggedInUser,
               accessToken,
               refreshToken
            },
            "Logged in successfully"
         )
      )
})

const logoutUser = asyncHandler(async (req, res, next)=>{
      await User.findByIdAndUpdate(
         req.user._id, 
         {
            $set:{
               refreshToken:undefined
            }
         },
         {
            new:true
         }
      );

      return res
      .status(200)
      .clearCookie("accessToken", cookieResOptions)
      .clearCookie("refreshToken", cookieResOptions)
      .json(
         new ApiResponse(
            200, 
            {},
            "Logged out successfully"
         )
      )
})

const refreshToken = asyncHandler(async (req, res, next)=>{
      /*
         1) get refresh token from cookies
         2) check if refresh token is available or not
         3) verify refresh token
         4) generate new access token
         5) send new access token to frontend
      */
      const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
      //const {refreshToken} = req.cookies || req.body.refreshToken;
      console.log("refreshToken",incomingRefreshToken)

      if(!incomingRefreshToken){
         throw new ApiError(401, "Please login to continue")
      }

      try {
         const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
         )
   
         const user = await User.findById(decodedToken?._id);
   
         if(!user){
            throw new ApiError(404, "Invalid Token, User not found")
         }
   
         const isRefreshTokenAvailable = user.refreshToken === incomingRefreshToken;

         if (!isRefreshTokenAvailable) {
               throw new ApiError(401, "Refresh token is expired, please login again")
         }
   
         const {accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
         
         return res
         .status(200)
         .cookie("accessToken", accessToken, cookieResOptions)
         .cookie("refreshToken", newRefreshToken, cookieResOptions)
         .json(
            new ApiResponse(
               200, 
               {
                  accessToken,
                  refreshToken:newRefreshToken
               },
               "Token refreshed successfully"
            )
         )
      } catch (error) {
         throw new ApiError(401, error?.message || "Invalid Token, please login again")
      }
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
   const {oldPassword, newPassword} = req.body; 

   const user = await User.findById(req.user?._id)
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

   if(!isPasswordCorrect){
      throw new ApiError(400, "Invalid old password")
   }

   user.password = newPassword
   await user.save({validateBeforeSave: false})

   return res
   .status(200)
   .json(new ApiResponse(
      200,
      {},
      "Password Changed Successfully"
   ))
})

const getCurrentUser = asyncHandler(async(req, res)=>{

   return res
   .status(200)
   .json(new ApiResponse(
      200,
      req.user,
      "User data fetched"
   ))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
   const {fullName, email} = req.body
   if(!fullName || !email){
      throw new ApiError(400, "All Fields are required")
   }

   const user = User.findByIdAndUpdate(
      req.user?._id,
      {
         $set:{
            fullName,
            email:email
         },
      },
      {new:true}
   ).select("-password")

   return res
   .status(200)
   .json(
      new ApiResponse(
         200,
         user,
         "Account details successfully"
      )
   )
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
   const avatarLocalPath = req.file?.path
   if(!avatarLocalPath){
      throw new ApiError(400,"File path is missing")
   }
   const avatar = await uploadOnCloudinary(avatarLocalPath)

   if(!avatar.url){
      throw new ApiError(400, "Error while uploading Avatar Image")
   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set:{
            avatar:avatar.url
         }
      },{new:true}
   ).select("-password")

   //TODO: Delete Old cloudnary image

   return res
   .status(200)
   .json(
      new ApiResponse(
         200,
         user,
         "Avatar update successfully"
      )
   )
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
   const avatarLocalPath = req.file?.path

   if(!avatarLocalPath){
      throw new ApiError(400,"File path is missing")
   }
   const avatar = await uploadOnCloudinary(avatarLocalPath)

   if(!avatar.url){
      throw new ApiError(400, "Error while uploading Cover Image")
   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set:{
            coverImage:avatar.url
         }
      },{new:true}
   ).select("-password")

   //TODO: Delete Old cloudnary image

   return res
   .status(200)
   .json(
      new ApiResponse(
         200,
         user,
         "Cover Image update successfully"
      )
   )
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
   const {username} = req.params;

   if(!username?.trim()){
      throw new ApiError(400, "username is missing")
   }

   const userDetails = await User.aggregate([
      {
         $match:{
            username:username?.toLowerCase()
         }
      },
      {
         $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
         }
      },
      {
         $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribedTo"
         }
      },
      {
         $addFields:{
            subscribersCount:{
               $size:"$subscribers"
            },
            channelsSubscriberToCount:{
               $size:"$subscriberTo"
            },
            isSubscribed:{
               $cond:{
                  if:{
                     $in:[req.user?._id, "$subscribers.subscriber"]
                  },
                  then:true,
                  else:false
               }
            }
         }
      },
      {
         $project:{
            fullName:1,
            username:1,
            subscribersCount:1,
            channelsSubscriberToCount:1,
            isSubscribed:1,
            avatar:1,
            coverImage:1,
            email:1
         }
      }
   ])

   if(!userDetails?.length){
      throw new ApiError(404, "Channel does not exists")
   }

   return res
   .status(200)
   .json(
      new ApiResponse(
         200,
         userDetails[0],
         "User details fetched successfully"
      )
   )
})
export {
   registerUser,
   loginUser,
   logoutUser,
   refreshToken,
   changeCurrentPassword,
   getCurrentUser,
   updateAccountDetails,
   updateUserAvatar,
   updateUserCoverImage,
   getUserChannelProfile
}