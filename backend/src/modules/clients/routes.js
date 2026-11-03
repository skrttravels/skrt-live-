const express = require('express');
const router = express.Router();
const { getClients, getClientById, createClient, updateClient, deleteClient } = require('./controller');
const { protect } = require('../../middleware/authMiddleware');
const { requirePermission } = require('../../middleware/permissionMiddleware');

router.route('/')
  .get(protect, getClients)
  .post(protect, requirePermission('clients', 'create'), createClient);

router.route('/:id')
  .get(protect, getClientById)
  .put(protect, requirePermission('clients', 'edit'), updateClient)
  .delete(protect, requirePermission('clients', 'delete'), deleteClient);

module.exports = router;
