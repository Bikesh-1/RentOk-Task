import crypto from "crypto";

const adminAuth = (req, res, next) => {
    const providedKey = req.headers["x-admin-key"];
    const actualKey = process.env.ADMIN_API_KEY;

    if (!actualKey || !providedKey) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized access"
        });
    }

    const providedBuffer = Buffer.from(providedKey);
    const actualBuffer = Buffer.from(actualKey);

    if (
        providedBuffer.length !== actualBuffer.length ||
        !crypto.timingSafeEqual(providedBuffer, actualBuffer)
    ) {
        return res.status(401).json({
            success: false,
            message: "Invalid admin key"
        });
    }

    next();
};

export default adminAuth;