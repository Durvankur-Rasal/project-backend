import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: toggle like on video
    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid Video ID");
    }
    const user = req.user._id;
    const likedVideo = await Like.findOne({
      $and: [{ video: videoId }, { likedBy: user }],
    });
  
    if (!videoLike) {
      const like = await Like.create({
        video: videoId,
        likedBy: user,
      });
  
      if (!like) {
        throw new ApiError(500, "Error while liking the video");
      }
  
      return res
        .status(200)
        .json(new ApiResponse(200, like, "User Liked the video"));
    }
  
    const unlikeVideo = await Like.findByIdAndDelete(likedVideo._id);
    if (!unlikeVideo) {
      throw new ApiError(500, "Error while unliking the video");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, unlikeVideo, "User Unliked the video"));
  });

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment ID")
    }

    const user= req.user._id

    const likedComment = await Like.findOne({
        $and:[{comment:commentId}, {likedBy:user}],
    });

    if(!likedComment){
        const comment = await Like.create({
            comment: commentId,
            likedBy: user,
        })

        if(!comment){
            throw new ApiError(500, "Error while liking the comment");
        }
        return res.status(200).json(new ApiResponse(200, comment, "User Liked the comment"));
    }

    const unlikeComment = await Like.findByIdAndDelete(likedComment._id);
    if(!unlikeComment){
        throw new ApiError(500, "Error while unliking the comment");
    }

    return res.status(200).json(new ApiResponse(200, unlikeComment, "User Unliked the comment"));

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet ID")
    }

    const user= req.user._id

    const likedTweet = await Like.findOne({
        $and:[{tweet:tweetId}, {likedBy:user}],
    });

    if(!likedTweet){
        const tweet = await Like.create({
            tweet: tweetId,
            likedBy: user,
        })

        if(!tweet){
            throw new ApiError(500, "Error while liking the tweet");
        }

        return res.status(200).json(new ApiResponse(200, tweet, "User Liked the tweet"));
    }

    const unlikeTweet = await Like.findByIdAndDelete(likedTweet._id);

    if(!unlikeTweet){
        throw new ApiError(500, "Error while unliking the tweet");
    }

    return res.status(200).json(new ApiResponse(200, unlikeTweet, "User Unliked the tweet"));

}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const likedVideos= await Like.aggregate([
        {
            $match: {
               likedBy: new mongoose.Types.ObjectId(req.user._id),
            video:{$exist:true, $ne:null},
            },
        },

        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"video",
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
                                        avatar:1,
                                        username:1,
                                        fullName:1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner",
                            },
                        },
                    },
                    {
                        $project:{
                            videoFile:1,
                            thumbnail:1,
                            title:1,
                            duration:1,
                            views:1,
                            owner:1,

                        },
                    },
                ],
            },
        },
        {
            $unwind:"$video",
        },
        {
            $project:{
                video:1,
                likedBy:1,
            },
        },
    ]);

    return res
    .status
    .json(new ApiResponse(200, likedVideos, "Liked videos retrieved successfully"));
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}