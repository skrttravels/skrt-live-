const express = require("express");
const { getAll, getByDate, getById, create, update, remove } = require("./controller");

const router = express.Router();

router.route("/")
  .get(getAll)
  .post(create);

router.route("/date/:date")
  .get(getByDate);

router.route("/:id")
  .get(getById)
  .put(update)
  .delete(remove);

module.exports = router;
