const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  images: {
    type: [
      {
        url: String,
      },
    ],
    default: [],
  },
  owner: {
    display_name: {
      type: String,
      default: '',
    },
  },
  tracks: {
    items: {
      type: Array,
      default: [],
    },
    total: {
      type: Number,
      default: 0,
    },
  },
  followers: {
    total: {
      type: Number,
      default: 0,
    },
  },
  public: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

module.exports = mongoose.model('Playlist', playlistSchema);
