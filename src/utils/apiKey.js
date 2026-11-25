import crypto from "crypto";

// Generate a secure random API key
export const generateApiKey = () => {
    return "gw_" + crypto.randomBytes(32).toString("hex");
};

// Convert API key into SHA-256 hash
export const hashApiKey = (apiKey) => {
    return crypto
        .createHash("sha256")
        .update(apiKey)
        .digest("hex");
};