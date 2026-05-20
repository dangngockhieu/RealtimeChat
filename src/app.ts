import express from 'express';
import 'dotenv/config';
import webRoutes from './routes/hello';
const app = express();
const port = process.env.PORT || 3000;

// config routes
webRoutes(app);

// config static files
app.use(express.static('public'));

// health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});