import { Router, type Request, type Response } from 'express';
import { createStudentSchemaWorkbook, createTeacherSchemaWorkbook } from '../utils/excel.ts';

const router = Router();

// GET /api/schema/teacher-template.xlsx
router.get('/teacher-template.xlsx', (req: Request, res: Response) => {
  try {
    const buffer = createTeacherSchemaWorkbook();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="teacher_schema_template.xlsx"');
    return res.send(buffer);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate teacher schema template' });
  }
});

// GET /api/schema/student-template.xlsx
router.get('/student-template.xlsx', (req: Request, res: Response) => {
  try {
    const buffer = createStudentSchemaWorkbook();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="student_master_schema_template.xlsx"');
    return res.send(buffer);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate student schema template' });
  }
});

export default router;
