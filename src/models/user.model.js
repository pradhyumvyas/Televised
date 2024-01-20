import mongoose,{Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema({
   username:{
         type:String,
         unique:true,
         required:true,
         lowercase:true,
         trim:true,
         index:true
      },
      email:{
         type:String,
         unique:true,
         required:true,
         lowercase:true,
         trim:true,
      },
      fullName:{
         type:String,
         required:true,
         trim:true,
         index:true
      },
      avatar:{
         type:String, // cloudnary url
         required:true,
      },
      coverImage: {
         type: String, // cloudinary url
     },
      watchHistory:[
         {
            type:Schema.Types.ObjectId,
            ref:"Video"
         }
      ],
      password:{
         type:String,
         required:[true,"Password is required"],
      },
      refreshToken:{
         type:String,
      }
},{timestamps:true});

//pre hook for hashing password when password is modified or created, next() is used to move to next middleware
userSchema.pre("save", async function(next){
   if(!this.isModified("password")) return next();

   this.password = await bcrypt.hash(this.password,10);
   next()
})

// for checking or comparing password at the time of logging in
userSchema.methods.isPasswordCorrect = async function(password){
   return await bcrypt.compare(password,this.password);
}

userSchema.methods.generateAccessToken = function(){
   return jwt.sign(
      {
         _id:this._id,
         email:this.email,
         username:this.username,
         fullName:this.fullName,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
         expiresIn:process.env.ACCESS_TOKEN_EXPIRY
      }
   )
}
userSchema.methods.generateRefreshToken = function(){
   return jwt.sign(
      {
         _id:this._id
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
         expiresIn:process.env.REFRESH_TOKEN_EXPIRY
      }
   )
}

export const User =  mongoose.model("User", userSchema);