const config = require('./config');

const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors({
  methods: ['GET', 'POST', 'DELETE', 'PUT']
}));

const port = process.env.PORT || 3000;

app.use(express.json()); //Used to parse JSON bodies
app.use(express.urlencoded({ extended: true })); //Parse URL-encoded bodies

const router = require('./openlimedb');

app.get('/', (req, res) => {
  res.json({ 'message': 'ok' });
})

app.use('/ol', router);

/* Error handler middleware */
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(err.message, err.stack);
  res.status(statusCode).json({ 'message': err.message });
  return;
});

app.listen(port, () => {
  console.log(`openlimDB server listening at http://localhost:${port}`)
});