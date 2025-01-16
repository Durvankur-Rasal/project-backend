import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js"; 
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
   try {
      const user= await User.findById(userId);
      const accessToken = await user.generateAccessToken()
      const refreshToken = await user.generateRefreshToken()

      user.refreshToken = refreshToken
      await user.save({validateBeforeSave:false}); // don't validate all fields while saving.
      return {accessToken, refreshToken}
      
   } catch (error) {

      throw new ApiError(500, "Something went wrong while  generating tokens")
   }
}

const registerUser= asyncHandler(async(req,res)=> {
     // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const {fullName,email,username,password} = req.body 
    // console.log("avatar: " , avatar);

     if(
        [fullName,email,username,password].some((filed)=>
            filed?.trim()==="")
     ){
        throw new ApiError(400,"All fields are required")
     }
    
     const existedUser = await User.findOne({
        $or:[{username},{email}] 
     });

     if(existedUser){
        throw new ApiError(409,"User already exists")
     } 

     console.log(req.body);

     const avatarLocalPath= req.files?.avatar?.[0]?.path;
     const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

     if(!avatarLocalPath){
        // console.log("hi")
        throw new ApiError(400,"Avatar is required")
     }

   const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage =  coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath): null;

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

  const user=  await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // _id is given by database when object creats
   const createdUser =await User.findById(user._id).select(
    "-password -refreshToken"
   )  // password and refresh token removed from field 

   if(!createdUser){
    throw new ApiError(500,"something went wrong while registering user")
   }
    
 return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered successfully")
 )    
 
})

const loginUser= asyncHandler(async(req,res)=>{
   // req body->data
   // username and password
   // find user
   // password check
   //generate access token and refresh
   // send cookies

   const {email,username,password}= req.body
   console.log(email);

   if(!username && !email){
      throw new ApiError(400,"Username or email is required")
   }

   // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")
        
    // }

    const user = await User.findOne({
         $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

      if(!isPasswordValid){
         throw new ApiError(401,"Invalid credentials")
      }

      const {accessToken, refreshToken}= await generateAccessAndRefreshTokens(user._id)

      const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

      const options= {
         httpOnly:true,
         secure:true
      }

      return res
      .status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",refreshToken,options)
      .json(
         new ApiResponse(200,{
            user:loggedInUser,
            accessToken,
            refreshToken
         },"User logged in successfully")
      )


})

const logoutUser= asyncHandler(async(req,res)=>{
     await User.findByIdAndUpdate(
       req.user._id,  // it will get from auth midldleware
       {

         $unset:{
            refreshToken:1 // this removes the field from database
         }
       },
       {
         new:true
       }
     )

     const options  = {
      httpOnly:true,
      secure:true
     }

     return res
     .status(200)
     .clearCookie("accessToken",options)
     .clearCookie("refreshToken",options)
     .json(new ApiResponse(200,{},"User logged out successfully"))
})

const refreshAccessToken= asyncHandler(async(req,res)=>{
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken 
   
   if(!incomingRefreshToken){
      throw new ApiError(400,"Refresh token is required")
   }

   try {
      const decodedToken= jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET
      )

      const user= await User.findById(decodedToken?._id)

      if(!user){
         throw new ApiError(404,"Invalid refresh token")
      }

      if(incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401,"Refresh token is expired or used")
      }

      const options= {
         httpOnly:true,
         secure:true
      }

      const {accessToken, newRefreshToken}= await generateAccessAndRefreshTokens(user._id)

      return res
      .status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",newRefreshToken,options)
      .json(
         new ApiResponse(
            200,
            {accessToken, refreshToken:newRefreshToken},
            "access token refreshed successfully"
         )
      )


   } catch (error) {
      throw new ApiError(401,error?.message || "Invalid refresh token")
   }
})

const changeCurrentUser= asyncHandler(async(req, res) =>{
   const {oldPassword, newPassword} = req.body;

   const user= await User.findById(req.user?._id)
   const isPasswordCorrect= await User.isPasswordCorrect(oldPassword)

   if(! isPasswordCorrect) {
      throw new ApiError(401,"Invalid old password")
   }

   user.password= newPassword;
   await user.save({validateBeforeSave:false})
  
   return res
   .status(200)
   .json(new ApiResponse(200,{},"Password changed successfully"))


})

const getCurrentUser= asyncHandler(async(req,res)=>{
   return res
   .status(200)
   .json(new ApiResponse(200,
      req.user,
      "User retrieved successfully"
   ))

})


const updateAccountDetails= asyncHandler(async(req,res)=>{
   const{fullName,email} = req.body

   if(!fullName || !email){
      throw new ApiError(400,"Full name and email are required")
   }
   const user= await User.findByIdAndUpdate(req.user?._id,
      {
         $set:{
            fullName,
            email: email
         }
      },
      {new:true}
   ).select("-password")

   return res
   .status(200)
   .json(new ApiResponse(200,user,"Account details updated successfully"))
})

const updateUserAvatar=  asyncHandler(async(req,res)=>{
   const avatarLocalPath= req.file?.path

   if(!avatarLocalPath){
      throw new ApiError(400,"Avatar file is required")
   }

   //TODO
   const oldAvatar= req.user?.avatar;
   oldAvatar && (await deleteFromCloudinary(oldAvatar))

   const avatar = await uploadOnCloudinary(avatarLocalPath)

   if(! avatar.url){
      throw new ApiError(400,"Avatar file is not uploaded")
   }

   const user= await User.findByIdAndUpdate(req._id,
      {
         set:{
            avatar: avatar.url
         }
      },
      {new:true}
   ).select("-password")

   return res
   .status(200)
   .json(new ApiResponse(200,user,"Avatar updated successfully"))

})

const updateCoverImage= asyncHandler(async(req,res)=>{
   const coverImageLocalPath= req.file?.path

   if(!coverImageLocalPath){
      throw new ApiError(400,"Cover image file is required")
   }

   const oldCoverImage= req.user?.coverImage;

   oldCoverImage && (await deleteFromCloudinary(oldCoverImage))

   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if(! coverImage.url){
      throw new ApiError(400,"Cover image file is not uploaded")
   }

   const user= await User.findByIdAndUpdate(req._id,
      {
         set:{
            coverImage: coverImage.url
         }
      },
      {new:true}
   ).select("-password")

   return res
   .status(200)
   .json(new ApiResponse(200,user,"Cover image updated successfully"))


})

const getUserChannelProfile= asyncHandler(async(req,res)=>{
   const {username}= req.params;

   if(!username?.trim()){
      throw new ApiError(400,"Username is missing")
   }

   const channel= await User.aggregate([
      {
         $match:{
            username: username?.toLowerCase()
         }
      },
      {
         $lookup:{
            from:"subscriptions", //from subscription.model
            localField: "_id",  
            foreignField:"channel",  // this field from subscription.model
            as:"subscribers"
         }
      }, 
      {
         $lookup:{
            from:"subscriptions",
            LocalField: "_id",
            foreignField:"subscriber",
            as:"subscribedTo"
         }
      },
      {
         $addFields:{
            subscribersCount:{
               $size:"$subscribers"
            },

            channelsSubscribedToCount:{
               $size:"$subscribedTo"
            },
            isSubscribed:{
               $cond:{
                  if:{$in: [req.user?._id, "$subscribers.subscriber"]},
                  then:true,
                  else:false
               }

            }
         }
      },

      {
         $project:{
            fullName: 1,
            username: 1,
            subscribersCount: 1,
            channelsSubscribedToCount: 1,
            isSubscribed: 1,
            avatar: 1,
            coverImage: 1,
            email: 1

         }
      }
   ])

   if(!channel?.length){
      throw new ApiError(404,"Channel not found")
   }

   return res
   .status(200)
   .json(
      new ApiResponse(200,channel[0],"Channel profile retrieved successfully")  // take [0] object
   )

})

const getWatchHistory= asyncHandler(async(req,res)=>{
   const user= await User.aggregate([
      {
         $match:{
            _id: new mongoose.Types.ObjectId(req.user._id)
         }
      },

      {
         $lookup:{
            from:"videos",
            localField:"watchHistory",
            foreignField:"_id",
            as:"watchHistory",
            pipeline:[
               {
                  $lookup:{
                     from:"users",
                     localField:"owner",
                     foreignField:"_id",
                     as:"owner",
                     pipeline:[
                        {
                           $project:{
                              fullName: 1,
                              username: 1,
                              avatar: 1
                           }
                        }
                     ]
                  }
               },
               {
                  $addFields:{
                     owner:{
                        $first:"$owner"  //The first operator in MongoDB's aggregation framework is used to return the first element in an array.
                     }
                  }
               }
            ]
         }
      }
   ])

   return res
   .status(200)
   .json(
      new ApiResponse(200,user[0],"Watch history retrieved successfully")  // take [0] object
   )
})



export {registerUser,loginUser, logoutUser,refreshAccessToken,changeCurrentUser,getCurrentUser,updateAccountDetails,updateUserAvatar,updateCoverImage,getUserChannelProfile,getWatchHistory}