const mongoose = require('mongoose');

const actionSchema = new mongoose.Schema({
  view:   { type: Boolean, default: true },
  create: { type: Boolean, default: false },
  edit:   { type: Boolean, default: false },
  delete: { type: Boolean, default: false },
}, { _id: false });

const rolePermissionSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['admin', 'manager'],
    unique: true,
    required: true,
  },
  permissions: {
    dashboard:  { type: actionSchema, default: { view: true } },
    shipments:  { type: actionSchema, default: { view: true, create: true, edit: true, delete: true } },
    inventory:  { type: actionSchema, default: { view: true, create: true, edit: true, delete: true } },
    cashMemos:  { type: actionSchema, default: { view: true } },
    vehicles:   { type: actionSchema, default: { view: true, create: true, edit: true, delete: true } },
    tracking:   { type: actionSchema, default: { view: true } },
    drivers:    { type: actionSchema, default: { view: true, create: true, edit: true, delete: true } },
    clients:    { type: actionSchema, default: { view: true, create: true, edit: true, delete: true } },
    invoices:   { type: actionSchema, default: { view: true, create: true, edit: true, delete: true } },
    contacts:   { type: actionSchema, default: { view: true, create: true, edit: true, delete: true } },
    expenses:   { type: actionSchema, default: { view: true, create: true, edit: true, delete: true } },
    analytics:  { type: actionSchema, default: { view: true } },
    users:      { type: actionSchema, default: {} },
    settings:   { type: actionSchema, default: {} },
  },
}, { timestamps: true });

module.exports = mongoose.model('RolePermission', rolePermissionSchema);
