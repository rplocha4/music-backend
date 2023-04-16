const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require('cors');
const SpotifyWebApi = require('spotify-web-api-node');
const connectDB = require('./config/db.js');
const bcrypt = require('bcrypt');
const User = require('./db/userModel');
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

app.post('/api/unfollowArtist/:username', (request, response) => {
  const { username } = request.params;
  const { artist } = request.body;
  User.findOneAndUpdate(
    { username: username },
    { $pull: { followingArtists: { id: artist.id } } }
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
  console.log(artist);
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
  console.log(request.body.password);
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
          });
        })
        .catch((error) => {
          response.status(500).send({
            message: 'Error creating user',
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
  User.findOne({ email: request.body.email })

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
          });
        })
        .catch((error) => {
          response.status(400).send({
            message: 'Passwords does not match',
            error,
          });
        });
    })
    .catch((e) => {
      response.status(404).send({
        message: 'Email not found',
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
