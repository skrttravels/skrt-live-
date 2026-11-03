const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/jobjockey')
  .then(async () => {
    const db = mongoose.connection.db;
    const shipments = await db.collection('shipments').find().sort({createdAt: -1}).limit(2).toArray();
    shipments.forEach(s => {
      console.log('Shipment ID:', s._id);
      console.log('statusHistory:', JSON.stringify(s.statusHistory, null, 2));
    });
    process.exit(0);
  })
  .catch(console.error);
