import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import userRoutes from './routes/user.routes';
import { responseFormatter } from './middlewares/formatResponse/success/successResponse';
import { errorHandler } from './middlewares/formatResponse/exception/errorHandler';

const app = express();
const origins = process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean);

app.use(
  cors({
    origin: origins && origins.length > 0 ? origins : true,
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Áp dụng middleware formatResponse (SUCCESS)
app.use(responseFormatter);

// Config routes
userRoutes(app);

app.get('/', (_req, res) => {
  res.send("Server is running");
});

// Áp dụng middleware Error Handler (EXCEPTION)
app.use(errorHandler);

export default app;
