import {asyncHandler} from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const generateAccessAndRefreshTokens = async (userId) =>{
   try{
      const  user = await User.findById(userId);
      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({validateBeforeSave:false});

      return {accessToken, refreshToken}

   } catch(e){
      throw new ApiError(500, "Error while generating tokens")
   }
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

      if(!username || !email){
         throw new ApiError(400, "Username or email is required")
      }

      const user = await User.findOne({
         $or:[
            {username: username.toLowerCase()},
            {email: email.toLowerCase()}
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

      const options = {
         httpOnly:true,
         secure:true
      }

      return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
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
      const options = {
         httpOnly:true,
         secure:true
      }
      return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(
         new ApiResponse(
            200, 
            {},
            "Logged out successfully"
         )
      )
   })

export {
   registerUser,
   loginUser,
   logoutUser
}