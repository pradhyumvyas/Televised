const asyncHandler = (requestHandler)=>{
   return (req, res, next)=>{
      Promise.resolve(requestHandler(req, res, next)).
      catch((err)=> next(err));
   }
}

export {asyncHandler}


// const asyncHandler1=(fn)=> async (req,res,next) =>{
//    try{
//       await fn()
//    }catch(error){
//       res.status(err.code || 500).json({
//          message: error.message || "Something went wrong",
//          success: false
//       })
//       console.error("Error", error);
//       throw error
//    }
// }