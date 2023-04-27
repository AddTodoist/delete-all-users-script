// Configure .env variables
import dotenv from 'dotenv';
dotenv.config();

// get users from db
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGO_DB);

const userSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    todoistToken: { type: String, required: true },
    todoistProjectId: { type: String, required: true },
    noResponse: { type: Boolean, required: false },
    threadLabel: { type: String, required: false },
    tweetLabel: { type: String, required: false },
    todoistId: { type: String, required: true },
}, { strict: true });

const UserInfo = mongoose.model('users', userSchema);


// function to decrypt token
import CryptoJS from 'crypto-js';

const secret = process.env.DB_SECRET;
const decryptString = (data) => CryptoJS.AES.decrypt(data, secret).toString(CryptoJS.enc.Utf8);


// function revoke token from todoist
const revokeAccessToken = async (token) => {
    const revokeUrl = 'https://api.todoist.com/sync/v9/access_tokens/revoke';

    const status = await fetch(revokeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: process.env.TODOIST_CLIENT_ID,
            client_secret: process.env.TODOIST_CLIENT_SECRET,
            access_token: token,
        })
    }).then((res) => res.status);

    if (status === 204) return true;
    return false;
};


// delete all users from db

const allUsers = await UserInfo.find({});

console.log(`Deleting ${allUsers.length} users`);
let totalUsers = allUsers.length;

for (const user of allUsers) {
    console.log(`Deleting user ${user._id}`);
    console.log("Remaining users: " + --totalUsers);

    const { todoistToken } = user;
    const decryptedToken = decryptString(todoistToken);

    const revoked = await revokeAccessToken(decryptedToken);
    if (revoked) {
        console.log(`Revoked token for ${user._id}`);
        await user.deleteOne();
    } else {
        console.log(`Failed to revoke token for ${user._id}`);
    }
}

process.exit(0)
