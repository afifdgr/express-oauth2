const express = require("express"),
  router = express.Router(),
  controller = require("../controllers/controller");

router.get("/", (req, res) => {
  res.sendStatus(200).json("Ok");
});
router.post("/register", controller.register);
router.post("/login", controller.login);
router.get("/users", controller.users);

/* Google Autg */
router.get("/auth/google", controller.googleLogin);
router.get("/auth/google/callback", controller.googleCallbackLogin);

module.exports = router;
