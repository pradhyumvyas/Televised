import mongoose from "mongoose";
import { DB_Name } from "../constants.js";

const connectDB = async ()=>{
   try{
      const connInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_Name}`)
      console.log(`\n MongoDB Connected , DB Host ${connInstance.connection.host}`);
   }
   catch(err){
      console.error("DB connection error", err);
      process.exit(1)
   }
}

export default connectDB;