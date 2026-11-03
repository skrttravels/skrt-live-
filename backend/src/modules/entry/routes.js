const express = require("express");
const {
  getAllEntries,
  getInventoryEntries,
  getEntryMetadata,
  getEntryByDate,
  getEntryByGrNo,
  getEntryBySno,
  getEntryById,
  createEntry,
  updateEntry,
  updateSingleEntry,
  bulkUploadEntries,
  deleteEntry,
  deleteSingleEntry
} = require("./controller");

const router = express.Router();
const shortCache = (req, res, next) => {
  res.set('Cache-Control', 'private, max-age=5');
  res.vary('Authorization');
  next();
};

router
  .route("/")
  .get(getAllEntries)
  .post(createEntry);

router
  .route("/inventory")
  .get(shortCache, getInventoryEntries);

router
  .route("/metadata")
  .get(shortCache, getEntryMetadata);

router
  .route("/upload")
  .post(bulkUploadEntries);

router
  .route("/date/:date")
  .get(getEntryByDate);

router
  .route("/grno/:grNo")
  .get(getEntryByGrNo);

router
  .route("/sno/:sno")
  .get(getEntryBySno);

router
  .route("/:id/entries/:entryId")
  .put(updateSingleEntry)
  .delete(deleteSingleEntry);

router
  .route("/:id")
  .get(getEntryById)
  .put(updateEntry)
  .delete(deleteEntry);

module.exports = router;
