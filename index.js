const express = require("express");
const app = express();
const PORT = process.env.PORT || 8900;
const cors = require('cors')

app.get("/", (req, res) => {
  res.send("Welcome to Socket.IO App! - Clue Mediator");
});
app.use(
  cors({
    origin: "*", // URL of the react (Frontend) app
  })
);
const server = app.listen(PORT, () => {
  console.log("Server started on: " + PORT);
});
const io = require("socket.io")(server);
const dotenv = require("dotenv");
dotenv.config();
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});
let users = [];
let user;
let activeFriendsSocketId = [];
app.get("/", (req, res) => {
  res.send("Welcome to Socket.IO App! - Clue Mediator");
});
const addUser = (userId, profilePicture, socketId, userName) => {
  !users.some((user) => user.userId === userId) &&
    users.push({ userId, socketId, profilePicture, userName });
};
const removeUser = (socketId) => {
  users = users.filter((user) => {
    return user.socketId !== socketId;
  });
};
const getUser = (receiverId) => {
  user = users.find((user) => user.userId === receiverId);
};
const getActiveFriends = (ActiveFriends) => {
  activeFriendsSocketId = ActiveFriends.map((ActiveFriend) => {
    return users.find((user) => user.userId === ActiveFriend._id)?.socketId;
  });
};
const getUsers = (USERS) => {
  activeFriendsSocketId = USERS.map((USERS) => {
    return users.find((user) => user.userId === USERS)?.socketId;
  });
};
io.on("connection", (socket) => {
  console.log("connecting");
  socket.on("addUser", (user) => {
    addUser(user._id, user.profilePicture, socket.id, user.userName);
    io.emit("getUsers", users);
  });

  socket.on(
    "sendMessage",
    ({ senderId, receiverId, text, profilePicture, _id }) => {
      getUser(receiverId);
      if (user) {
        io.to(user.socketId).emit("getMessage", {
          senderId,
          text,
          profilePicture,
          _id,
        });
      }
    }
  );
  socket.on("disconnect", () => {
    console.log("disconnection");
    removeUser(socket.id);
    io.emit("getUsers", users);
  });
  socket.on("AddPost", (post, activeList) => {
    getActiveFriends(activeList);
    activeFriendsSocketId.length > 0 &&
      io.in(activeFriendsSocketId).emit("getPost", post);
  });
  socket.on("updatePost", (updated, newElement, post, activeList) => {
    getActiveFriends(activeList);
    if (updated === "comments") {
      post[updated].unshift(newElement);
    } else {
      post.loves = newElement.loves;
      post.likes = newElement.likes;
    }
    console.log(activeFriendsSocketId);
    activeFriendsSocketId.length > 0 &&
      io.in(activeFriendsSocketId).emit("getUpdatePost", post, updated);
  });
  socket.on("readmessage", (data) => {
    const OwnMessage = data.Messages.filter((Message) => {
      return Message.sender === data.userId;
    });
    const MessagesSeen = data.Messages.filter((Message) => {
      return Message.sender !== data.userId;
    }).map((message) => {
      message.isShow = true;
      return message;
    });
    const AllMessages = OwnMessage.concat(MessagesSeen);
    const sortedDatesAllMessages = AllMessages.sort(
      (dateA, dateB) => new Date(dateA) - new Date(dateB)
    );
    getUsers(data.receiver);
    activeFriendsSocketId.length > 0 &&
      io.in(activeFriendsSocketId).emit("getSeenMessage", post);
  });
  socket.on("sendFriendRequest", (data) => {
    getUser(data);
    io.in(user?.socketId).emit("getFreiendRequest", {
      _id: user?.userId,
      creatorProfilePicture: user?.profilePicture,
      Date: Date.now(),
      creatorUserName: user?.userName,
      creatorId: user?.userId,
    });
  });
  socket.on("DeletePost", (post, activeList) => {
    getActiveFriends(activeList);
    getUser(post.creatorId);
    io.in([...activeFriendsSocketId, user?.socketId]).emit(
      "DeleteOnePost",
      post
    );
  });
  socket.on("getUnSeen", (userId) => {
    getUser(userId);
    io.to(user?.socketId).emit("getUnSeenList");
  });
});
