class ApiError extends Error {
    constructor(
        statusCode,
        message="Something went wrong",
        errors= [],
        stack= ""

    ){
        super(message)
        this.statusCode= statusCode
        this.data=null
        this.message= message
        this.errors= errors
        this.errors = errors

        if(stack) // it is report file that contains information of error
        {
            this.stack= stack
        } else{
            Error.captureStackTrace(this, this.constructor) // to get the stack trace
        }
    }
}

export {ApiError}