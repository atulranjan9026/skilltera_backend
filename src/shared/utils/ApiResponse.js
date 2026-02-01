/**
 * Standardized API Response class
 */
class ApiResponse {
    /**
     * Create a standardized API response
     * @param {number} statusCode - HTTP status code
     * @param {*} data - Response data
     * @param {string} message - Response message
     */
    constructor(statusCode, data = null, message = 'Success') {
        this.success = statusCode < 400;
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
    }

    /**
     * Create a success response (200)
     */
    static success(data = null, message = 'Success') {
        return new ApiResponse(200, data, message);
    }

    /**
     * Create a created response (201)
     */
    static created(data = null, message = 'Resource created successfully') {
        return new ApiResponse(201, data, message);
    }

    /**
     * Create a no content response (204)
     */
    static noContent(message = 'No content') {
        return new ApiResponse(204, null, message);
    }

    /**
     * Send the response
     * @param {object} res - Express response object
     */
    send(res) {
        return res.status(this.statusCode).json({
            success: this.success,
            message: this.message,
            data: this.data,
        });
    }
}

module.exports = ApiResponse;
