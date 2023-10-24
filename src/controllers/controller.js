const { PrismaClient } = require("@prisma/client"),
  prisma = new PrismaClient(),
  jwt = require("jsonwebtoken"),
  bcrypt = require("bcrypt"),
  { google } = require("googleapis");
require("dotenv").config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:5000/auth/google/callback"
);

const scopes = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

const authorizationUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: scopes,
  include_granted_scopes: true,
});

module.exports = {
  googleLogin: (req, res) => {
    res.redirect(authorizationUrl);
  },

  googleCallbackLogin: async (req, res) => {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });

    const { data } = await oauth2.userinfo.get();

    if (!data.email || !data.name)
      return res.json({
        data: data,
      });

    let user = await prisma.users.findUnique({
      where: {
        email: data.email,
      },
    });

    if (!user) {
      user = await prisma.users.create({
        data: {
          name: data.name,
          email: data.email,
          address: "-",
        },
      });
    }
    const payload = {
      id: user.id,
      name: user.name,
      address: user.address,
    };
    const secret = process.env.JWT_SECRET;

    const expiresIn = 60 * 60 * 1;

    const token = jwt.sign(payload, secret, { expiresIn: expiresIn });

    // return res.redirect(`http://localhost:3000/auth-success?token=${token}`);

    return res.status(200).json({
      message: "Login Successfully",
      data: {
        id: user.id,
        name: user.name,
        address: user.address,
      },
      token: token,
    });
  },

  register: async (req, res) => {
    try {
      const { name, email, password } = req.body;

      const hashedPassword = await bcrypt.hash(password, 10);

      const data = await prisma.users.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      });

      return res.status(201).json({ message: "Register Success", data: data });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: error.message });
    }
  },

  login: async (req, res) => {
    const { email, password } = req.body;

    const user = await prisma.users.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.password) {
      return res.status(404).json({
        message: "Password not set",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (isPasswordValid) {
      const payload = {
        id: user.id,
        name: user.name,
        address: user.address,
      };

      const secret = process.env.JWT_SECRET;

      const expiresIn = 60 * 60 * 1;

      const token = jwt.sign(payload, secret, { expiresIn: expiresIn });

      return res.status(200).json({
        message: "Login Successfully",
        data: {
          id: user.id,
          name: user.name,
          address: user.address,
        },
        token: token,
      });
    } else {
      return res.status(403).json({
        message: "Wrong password",
      });
    }
  },

  users: async (req, res) => {
    const result = await prisma.users.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        address: true,
      },
    });
    res.json({
      message: "User list",
      data: result,
    });
  },
};
