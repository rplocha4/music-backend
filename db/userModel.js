const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide an Email!'],
    unique: [true, 'Email Exist'],
  },
  username: {
    type: String,
    required: [true, 'Please provide a username!'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password!'],
    unique: false,
  },
  likedPlaylists: {
    type: Array,
    required: false,
    unique: false,
  },
  likedAlbums: {
    type: Array,
    required: false,
    unique: false,
  },
  followingArtists: {
    type: Array,
    required: false,
    unique: false,
  },
  followingUsers: {
    type: Array,
    required: false,
    unique: false,
  },
  likedSongs: {
    type: Array,
    required: false,
    unique: false,
  },
});
module.exports = mongoose.model.Users || mongoose.model('Users', UserSchema);
