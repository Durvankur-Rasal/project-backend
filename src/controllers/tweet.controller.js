import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body
    const user= req.user._id;

    if(!content){
        throw new ApiError(400,"Content is required")
    }

    const newTweet = await Tweet.create(

        {
            content,
            owner: user
        }
    )

    if(!newTweet){
        throw new ApiError(400, "Error while creating new Tweet")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,Tweet,"tweet created"))


})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params
    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid user ID")
    }

    const tweets = await Tweet.find({owner: userId})

    if(!tweets){
        throw new ApiError(404, "User tweets not found")
    }

    return res
   .status(200)
   .json(new ApiResponse(200, tweets, "User tweets retrieved successfully"))
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {content} = req.body;

    if(!content){
        throw new ApiError(400,"Content is required")
    }

    const {tweetId} = req.params
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet ID")
    }

    const owner = req.user._id;
    if(tweet.owner !== owner){
        throw new ApiError(403, "You are not authorized to update this tweet")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set:{
                content,
            },
        },
        {new:true}
    )

    return res
    .status(200)
    .json(new ApiResponse(201, updatedTweet, "Tweet updated"))


})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId}= req.params;

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet ID")
    }

    const tweet = await Tweet.findById(tweetId);
    if(!tweet){
        throw new ApiError(404, "Tweet not found")
    }

    const owner= req.user_id;

    if(tweet.owner !== owner){
        throw new ApiError(403, "You are not authorized to delete this tweet")
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId)

    if(!deletedTweet){
        throw new ApiError(500, "Error while deleting the tweet")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}