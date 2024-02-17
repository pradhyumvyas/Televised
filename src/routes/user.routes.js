import { Router } from "express";
import { 
   registerUser, 
   loginUser, 
   logoutUser,
   refreshToken, 
   changeCurrentPassword, 
   getCurrentUser, 
   updateAccountDetails, 
   updateUserAvatar, 
   updateUserCoverImage, 
   getUserChannelProfile, 
   getWatchHiistory } 
   from "../controllers/user.controller.js";
import {upload}  from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
   upload.fields([
      {
         name: "avatar",
         maxCount: 1
      },
      {
         name: "coverImage",
         maxCount: 1
      }
   ]),
   registerUser
)
router.route("/login").post(loginUser);

// Secured Routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").post(verifyJWT, getCurrentUser)
router.route("/update-detail").patch(verifyJWT, updateAccountDetails)

router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/updater-cover-image").patch(verifyJWT, upload.single("/coverImage"), updateUserCoverImage)

router.route("/channel/:username").get(verifyJWT, getUserChannelProfile)
router.route("/watch-hostory").get(verifyJWT, getWatchHiistory)

export default router;