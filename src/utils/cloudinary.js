import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables

cloudinary.config({ 
  cloud_name : process.env.CLOUDINARY_CLOUD_NAME, 
  api_key : process.env.CLOUDINARY_API_KEY, 
  api_secret : process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            // console.log("hi")
            return null;
        }
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        })
        // file has been uploaded successfull
        console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        // Check if the file exists before attempting to delete it
        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath); // Remove the locally saved temporary file as the upload operation failed
        }
        return null;
    }
}

const deleteFromCloudinary= async (cloudinaryFilePath)=>{
    try{
        if(!cloudinaryFilePath) return null;

        const fileName= cloudinaryFilePath.split("/").pop().split(".")[0];
        const response= await cloudinary.uploader.destroy(fileName);
        return response;

    } catch (error){
        console.error("Error while deleting from Cloudinary:", error);
        return null;
    }
};





export {uploadOnCloudinary, deleteFromCloudinary}