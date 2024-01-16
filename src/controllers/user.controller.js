import {asyncHandler} from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

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
      [fullName, email, username,passsword].some((field)=> field?.trim() === "")
  ){
      throw new ApiError(400, `${field} cannot be empty`)
  }

  User.findOne({
      $or: [
          { username },
          { email}
      ]
  }).then((user)=>{
      if(user){
          throw new ApiError(409, "User already exists with this username or email")
      }
  })

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

   const userCreated = User.findById(user._id).select(
      "-password -refreshToken"
   )
   if(!userCreated){
      throw new ApiError(500, "Error while creating user")
   }

   return res.status(201).json(
      new ApiResponse(200, userCreated, "User created successfully")
   )
});


export {registerUser}