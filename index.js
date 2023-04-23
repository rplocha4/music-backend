const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require('cors');
const SpotifyWebApi = require('spotify-web-api-node');
const connectDB = require('./config/db.js');
const bcrypt = require('bcrypt');
const User = require('./db/userModel');
const Playlist = require('./db/PlaylistModel');
const jwt = require('jsonwebtoken');
const auth = require('./auth');

const port = 5000;

dotenv.config();
const app = express();

app.use(bodyParser.json());
app.use(cors());

connectDB();

app.get('/auth', auth, (request, response) => {
  response.json({ message: 'authorized' });
});

app.get('/api/user/:username', (request, response) => {
  const { username } = request.params;
  User.findOne({ username: username })
    .then((user) => {
      response.status(200).send({
        message: 'User Found',
        user,
      });
    })
    .catch((e) => {
      response.status(404).send({
        message: 'User not found',
        e,
      });
    });
});
app.get('/api/searchUser/:q', async (req, res) => {
  try {
    const searchTerm = req.params.q;
    console.log(searchTerm);
    const regexQuery = new RegExp(searchTerm, 'i');

    const users = await User.find({
      username: { $regex: regexQuery },
    });

    res.status(200).json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});
// app.get('/api/followedArtists/:username', (request, response) => {
//   const { username } = request.params;
//   User.findOne({ username: username })
//     .then((user) => {
//       response.status(200).send({
//         message: 'User Found',
//         likedPlaylists: user.likedPlaylists,
//       });
//     })
//     .catch((e) => {
//       response.status(404).send({
//         message: 'User not found',
//         e,
//       });
//     });
// });
app.get('/api/getUserPlaylists/:userId', async (req, res) => {
  try {
    const playlists = await Playlist.find({
      createdBy: req.params.userId,
    }).exec();

    res.status(200).json(playlists);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});
app.get('/api/getPlaylist/:playlistId', async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.playlistId).exec();

    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    res.status(200).json(playlist);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.post('/api/createPlaylist/', async (req, res) => {
  try {
    const { name, description, images, owner, tracks, public, createdBy } =
      req.body;

    const playlist = new Playlist({
      name,
      description,
      images,
      owner,
      tracks,
      public,
      createdBy,
    });

    await playlist.save();
    console.log(playlist);

    res.status(201).json({ message: `Playlist: '${name}' created`, playlist });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});
app.delete('/api/playlists/:id', async (req, res) => {
  try {
    const playlistId = req.params.id;
    const deletedPlaylist = await Playlist.findOneAndDelete({
      _id: playlistId,
    });

    if (!deletedPlaylist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    res.status(200).json({ message: 'Playlist deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});
app.get('/api/searchPlaylists/:q', async (req, res) => {
  try {
    const query = req.params.q;

    if (!query) {
      return res
        .status(400)
        .json({ message: 'Query parameter "q" is required' });
    }

    const regexQuery = new RegExp(query, 'i');

    const playlists = await Playlist.find({
      $or: [
        { name: { $regex: regexQuery } },
        { description: { $regex: regexQuery } },
      ],
    }).exec();

    if (playlists.length === 0) {
      return res.status(404).json({ message: 'No playlists found' });
    }

    res.status(200).json(playlists);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});
app.post('/api/deletePlaylist/:username', (request, response) => {
  const { username } = request.params;
  const { playlistId } = request.body;
  User.findOneAndUpdate(
    { username: username },
    { $pull: { userPlaylists: { id: playlistId } } }
  )
    .then((user) => {
      response.status(200).send({
        message: 'Playlist Deleted',
        user,
      });
    })
    .catch((e) => {
      response.status(404).send({
        message: 'User not found',
        e,
      });
    });
});
app.post('/api/addTrackToPlaylist/:playlistId', async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.playlistId).exec();
    const dateAdded = new Date();
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    const newTrack = req.body.track;
    playlist.tracks.items.push({ track: newTrack, added: dateAdded });
    playlist.tracks.total += 1;

    const updatedPlaylist = await playlist.save();

    res.status(201).json({
      message: `Added ${newTrack.name} To ${playlist.name}`,
      updatedPlaylist,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});
app.get('/api/:userId/playlists/following', async (req, res) => {
  console.log(req.params.userId);
  try {
    const user = await User.findById(req.params.userId).exec();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const playlistIds = user.followedPlaylists;

    const playlists = await Playlist.find({ _id: { $in: playlistIds } }).exec();
    console.log(playlists);
    res.status(200).json(playlists);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});
app.delete('/api/:playlistId/songs/:trackId', async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.playlistId).exec();

    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    const trackIndex = playlist.tracks.items.findIndex(
      (item) => item.track.id == req.params.trackId
    );

    if (trackIndex === -1) {
      return res.status(404).json({ message: 'Track not found in playlist' });
    }
    const trackName = playlist.tracks.items[trackIndex].track.name;
    playlist.tracks.items.splice(trackIndex, 1);
    playlist.tracks.total -= 1;

    const updatedPlaylist = await playlist.save();

    res.status(200).json({
      message: `${trackName} deleted from '${playlist.name}'`,
      updatedPlaylist,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});
app.get('/api/:userId/playlists/:playlistId/following', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).exec();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const playlist = await Playlist.findById(req.params.playlistId).exec();

    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    const isFollowing = user.followedPlaylists.includes(playlist._id);

    res.status(200).json({
      message: `User is${isFollowing ? '' : ' not'} following ${playlist.name}`,
      isFollowing,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});
app.put('/api/:userId/playlists/:playlistId/unfollow', async (req, res) => {
  console.log(req.params.userId);
  console.log(req.params.playlistId);
  try {
    const user = await User.findById(req.params.userId).exec();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const playlist = await Playlist.findById(req.params.playlistId).exec();

    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    const index = user.followedPlaylists.indexOf(playlist._id);
    console.log(index);
    if (index !== -1) {
      user.followedPlaylists.splice(index, 1);
      await user.save();
    }
    playlist.followers.total -= 1;
    await playlist.save();

    res.status(200).json({ message: `Unfollowed ${playlist.name}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});
app.post('/api/:userId/playlists/:playlistId/follow', async (req, res) => {
  console.log('follow');
  try {
    const user = await User.findById(req.params.userId).exec();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const playlist = await Playlist.findById(req.params.playlistId).exec();

    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (user.followedPlaylists.includes(playlist._id)) {
      return res
        .status(400)
        .json({ message: 'Playlist is already being followed by this user' });
    }

    user.followedPlaylists.push(playlist._id);
    await user.save();

    playlist.followers.total += 1;
    await playlist.save();

    res
      .status(200)
      .json({ message: `Successfully followed ${playlist.name}`, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.get('/api/isLikingTrack/:username/:id', (request, response) => {
  const { username, id } = request.params;
  User.findOne({ username: username })
    .then((user) => {
      const likedTracks = user.likedTracks;
      const isLiking = likedTracks.some((item) => item.track.id === id);
      response.status(200).send({
        message: 'User Found',
        isLiking,
      });
    })
    .catch((e) => {
      response.status(404).send({
        message: 'User not found',
        e,
      });
    });
});

app.get('/api/likedTracks/:username', (request, response) => {
  const { username } = request.params;
  User.findOne({ username: username })
    .then((user) => {
      response.status(200).send({
        message: 'User Found',
        likedTracks: user.likedTracks,
      });
    })
    .catch((e) => {
      response.status(404).send({
        message: 'User not found',
        e,
      });
    });
});
app.post('/api/likeTrack/:username', (request, response) => {
  const { username } = request.params;
  const { track } = request.body;

  User.findOneAndUpdate(
    { username: username },
    {
      $push: { likedTracks: { track: track, added: new Date().toISOString() } },
    }
  )
    .then((user) => {
      response.status(200).send({
        message: 'Track added to liked tracks',
      });
    })
    .catch((e) => {
      response.status(404).send({
        message: 'User not found',
        e,
      });
    });
});
app.post('/api/unlikeTrack/:username', (request, response) => {
  const { username } = request.params;
  const { trackId } = request.body;
  // find track with id and remove it
  User.findOne({ username: username })

    .then((user) => {
      const updated = user.likedTracks.filter(
        (item) => item.track.id !== trackId
      );
      user.likedTracks = updated;
      user.save();
      response.status(200).send({
        message: 'Track removed from liked tracks',
        user,
      });
    })
    .catch((e) => {
      response.status(404).send({
        message: 'User not found',
        e,
      });
    });
});

app.post('/api/likeAlbum/:username', (request, response) => {
  const { username } = request.params;
  const { album } = request.body;
  User.findOneAndUpdate(
    { username: username },
    { $push: { likedAlbums: album } }
  )
    .then((user) => {
      response.status(200).send({
        message: 'Album added to liked albums',
      });
    })
    .catch((e) => {
      response.status(404).send({
        message: 'User not found',
        e,
      });
    });
});
app.post('/api/unlikeAlbum/:username', (request, response) => {
  const { username } = request.params;
  const { albumId } = request.body;
  User.findOneAndUpdate(
    { username: username },
    { $pull: { likedAlbums: { id: albumId } } }
  )
    .then((user) => {
      response.status(200).send({
        message: 'Album removed from liked albums',
      });
    })
    .catch((e) => {
      response.status(404).send({
        message: 'User not found',
        e,
      });
    });
});

app.post('/api/unfollowArtist/:username', (request, response) => {
  const { username } = request.params;
  const { artistId } = request.body;
  User.findOneAndUpdate(
    { username: username },
    { $pull: { followingArtists: { id: artistId } } }
  )
    .then((user) => {
      response.status(200).send({
        message: 'Artist removed from following artists',
      });
    })
    .catch((e) => {
      response.status(404).send({
        message: 'User not found',
        e,
      });
    });
});

app.get('/api/isAlbumLiked/:username/:albumId', (request, response) => {
  const { username, albumId } = request.params;
  User.findOne({ username: username })
    .then((user) => {
      response.status(200).send({
        message: 'User Found',
        isLiked:
          user.likedAlbums.find((album) => album.id === albumId) !== undefined
            ? true
            : false,
      });
    })
    .catch((e) => {
      response.status(404).send({
        message: 'User not found',
        e,
      });
    });
});
app.get('/api/isFollowingArtist/:username/:artistId', (request, response) => {
  const { username, artistId } = request.params;
  User.findOne({ username: username })
    .then((user) => {
      response.status(200).send({
        message: 'User Found',
        isFollowing:
          user.followingArtists.find((artist) => artist.id === artistId) !==
          undefined
            ? true
            : false,
      });
    })
    .catch((e) => {
      response.status(404).send({
        message: 'User not found',
        e,
      });
    });
});

app.post('/api/followArtist/:username', (request, response) => {
  const { username } = request.params;
  const { artist } = request.body;
  User.findOneAndUpdate(
    { username: username },
    { $push: { followingArtists: artist } }
  )
    .then((user) => {
      response.status(200).send({
        message: 'Artist added to following artists',
      });
    })
    .catch((e) => {
      response.status(404).send({
        message: 'User not found',
        e,
      });
    });
});

app.post('/register', (request, response) => {
  bcrypt
    .hash(request.body.password, 10)
    .then((hashedPassword) => {
      const user = new User({
        email: request.body.email,
        username: request.body.username,
        password: hashedPassword,
      });
      const token = jwt.sign(
        {
          userId: user._id,
          userEmail: user.email,
        },
        'RANDOM-TOKEN',
        { expiresIn: '24h' }
      );

      user
        .save()
        .then((result) => {
          response.status(201).send({
            message: 'User Created Successfully',
            result,
            token,
            username: request.body.username,
            _id: result._id,
          });
        })
        .catch((error) => {
          response.status(500).send({
            message: 'User already exists',
            error,
          });
        });
    })
    .catch((e) => {
      response.status(500).send({
        message: 'Password was not hashed successfully',
        e,
      });
    });
});

app.post('/login', (request, response) => {
  User.findOne({ username: request.body.username })

    .then((user) => {
      bcrypt
        .compare(request.body.password, user.password)

        .then((passwordCheck) => {
          if (!passwordCheck) {
            return response.status(400).send({
              message: 'Passwords does not match',
              error,
            });
          }

          const token = jwt.sign(
            {
              userId: user._id,
              userEmail: user.email,
            },
            'RANDOM-TOKEN',
            { expiresIn: '24h' }
          );

          response.status(200).send({
            message: 'Login Successful',
            username: user.username,
            token,
            _id: user._id,
          });
        })
        .catch((error) => {
          response.status(400).send({
            message: 'Wrong Password',
            error,
          });
        });
    })
    .catch((e) => {
      response.status(404).send({
        message: 'User not found',
        e,
      });
    });
});

app.post('/auth/login', (req, res) => {
  const code = req.body.code;
  const spotifyApi = new SpotifyWebApi({
    redirectUri: 'http://localhost:5173',
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  spotifyApi
    .authorizationCodeGrant(code)
    .then((data) => {
      res.json({
        accessToken: data.body.access_token,
        refreshToken: data.body.refresh_token,
        expiresIn: data.body.expires_in,
      });
    })
    .catch(() => {
      res.sendStatus(400);
    });
});

app.post('/auth/refresh', (req, res) => {
  const refreshToken = req.body.refreshToken;
  console.log('asd');
  const spotifyApi = new SpotifyWebApi({
    redirectUri: 'http://localhost:5173',
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    refreshToken,
  });
  spotifyApi
    .refreshAccessToken()
    .then((data) => {
      res.json({
        accessToken: data.body.access_token,
        expiresIn: data.body.expires_in,
      });
    })
    .catch((err) => {
      res.sendStatus(400);
    });
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
