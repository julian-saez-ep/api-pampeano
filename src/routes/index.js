import express from 'express';
const router = express.Router();
import { sendAttendance } from '../modules/attendance/controllers/attendance.controller.js';

router.post('/send-attendance', sendAttendance);

export default router;
