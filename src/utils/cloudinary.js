import {v2 as cloudinary} from "cloudinary";
import fs from "fs"; // To delete local files after upload
       
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET, 
});

const uploadOnCloudinary = async (path) => {
   try{
      if(!path) return null;
      const res = await cloudinary.uploader.upload(path, 
         {
            resource_type: "auto",
         });
         fs.unlinkSync(path);
         return res;
   }catch(e){
      console.log("Cloudinary Error", e)
      fs.unlinkSync(path); // remove the local save temp file 
      return null;
   }
}

export {uploadOnCloudinary}