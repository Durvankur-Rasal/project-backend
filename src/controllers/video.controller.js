import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    const videos = await Video.aggregate([
        {
            $match: {
                $or: [
                    {
                        title: {$regex: query, $options:"i"},
                    },
                    {
                        description: {$regex: query, $options:"i"},
                    },
                ],
            },
        },

        {
            $lookup: {
                from:"users",
                localField: "owner",
                foreignField: "_id",
                as: "createdBy",
            },
        },
        {
            $unwind:"$createdBy",
        },
        {
            $project:{
                thumbnail:1,
                videoFile:1,
                title:1,
                description:1,
                createdBy:{
                    fullName:1,
                    username:1,
                    avatar:1,
                },
            },
        },

        {
            $sort:{
                [sortBy]: sortType === "asc"? 1 : -1,
            },
        },
        {
            $skip: (page - 1) * limit,
        },
        {
            $limit: parseInt(limit),
        },
    ]);

    return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos retrieved successfully"));

});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    if(!title || !description) {
        throw new ApiError(400, "Title and description are required")
    }

    const videoLocalPath = req.files?.videoFile[0]?.path;

    if(!videoLocalPath){
        throw new ApiError(400, "Video file is required")
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath);

    if(!videoFile.url){
        throw new ApiError(400, "Video file is not uploaded")
    }

    const thumbnailLocalPath= req.files?.thumbnail[0]?.path;

    if(!thumbnailLocalPath){
        throw new ApiError(400, "Thumbnail is required")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if(!thumbnail.url){
        throw new ApiError(400, "Thumbnail is not uploaded")
    }

    const video= await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title,
        description,
        duration: videoFile.duration,
        owner: req.user._id,
    });

    if(!video){
        throw new ApiError(400, "Failed to create video")
    }
   
    return res.status(201).json(new ApiResponse(201, video, "Video published successfully"));

});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    if(!isValidObjectId(videoId)){
        throw new ApiError(404, "Video not found")
    }

    const video= await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "Video not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, video, "Video retrieved successfully"));


});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const {title,description}= req.body;
    const newThumbnailLocalPath = req.file?.path;

    if(isValidObjectId(videoId)){
        throw new ApiError(404, "Invalid video ID");
    }

    if(!title || !description){
        throw new ApiError(400, "Title and description are required");
    }

    if(!newThumbnailLocalPath){
        throw new ApiError(400, "Thumbnail is required");
    }

    const video= await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "Video not found");
    }

    if(video.owner !== req.user.id){
        throw new ApiError(403, "You are not authorized to update this video");
    }

    const deleteThumbnailResponse = await deleteFromCloudinary(video.thumbnail);

    if(deleteThumbnailResponse.result !== "ok"){
        throw new ApiError(400, "Failed to delete thumbnail");
    }

    const newThumbnail = await uploadOnCloudinary(newThumbnailLocalPath);

    if(!newThumbnail.url){
        throw new ApiError(400, "Failed to upload new thumbnail");
    }

    const updateVideo= await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                title,
                description,
                thumbnail: newThumbnail.url,
            },
        },
        {new:true}
    );

    return res
    .status(200)
    .json(new ApiResponse(200, updateVideo, "Video updated successfully"));

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if(!isValidObjectId(videoId)){
        throw new ApiError(404, "Invalid video ID");
    }

    const video= await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "Video not found");
    }

    if(video.owner !== req.user._id){
        throw new ApiError(403, "You are not authorized to delete this video");
    }

    const deleteVideoResponse = await deleteFromCloudinary(video.videoFile);

    if(deleteVideoResponse.result !== "ok"){
        throw new ApiError(400, "Failed to delete video");
    }

    const deleteThumbnailResponse = await deleteFromCloudinary(video.thumbnail);

    if(deleteThumbnailResponse.result !== "ok"){
        throw new ApiError(400, "Failed to delete thumbnail");
    }

    const deleteVideo = await Video.findByIdAndDelete(videoId);

    if(!deleteVideo){
        throw new ApiError(400, "Failed to delete video");
    }

    return res.status(200).json(new ApiResponse(200, {}, "Video deleted successfully"));


})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(404, "Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "Video not found");
    }

    if(video.owner !== req.user._id){
        throw new ApiError(403, "You are not authorized to update this video");
    }

    const modifyVideoPublishStatus= await Video.findByIdAndUpdate(
       videoId,
       {
        $set:{
            isPublished:!video.isPublished,
        },
       } ,
       {new:true}
    )

    return res 
    .status(200)
    .json(new ApiResponse(200, modifyVideoPublishStatus, "Video status updated successfully"));
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}