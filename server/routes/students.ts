import { Router, type Request, type Response } from 'express';
import {
  getAllStudents,
  getStudentById,
  saveStudent,
  deleteStudent,
} from '../db/firebase.ts';
import { processStudentExcel } from '../utils/excel.ts';
import type { StudentMaster } from '../../src/types/index.ts';

const router = Router();

// GET /api/students - List students with filter support
router.get('/', async (req: Request, res: Response) => {
  try {
    const { name, rollNumber, course, search } = req.query;
    let students = await getAllStudents();

    if (search && typeof search === 'string') {
      const q = search.trim().toLowerCase();
      students = students.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.rollNumber.toLowerCase().includes(q) ||
          s.course.toLowerCase().includes(q)
      );
    }

    if (name && typeof name === 'string') {
      const n = name.trim().toLowerCase();
      students = students.filter((s) => s.name.toLowerCase().includes(n));
    }

    if (rollNumber && typeof rollNumber === 'string') {
      const r = rollNumber.trim().toLowerCase();
      students = students.filter((s) => s.rollNumber.toLowerCase().includes(r));
    }

    if (course && typeof course === 'string') {
      const c = course.trim().toLowerCase();
      students = students.filter((s) => s.course.toLowerCase() === c || s.course.toLowerCase().includes(c));
    }

    return res.json({ students });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve students' });
  }
});

// GET /api/students/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const student = await getStudentById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student record not found' });
    }
    return res.json({ student });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to get student' });
  }
});

// POST /api/students - Add new student
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      rollNumber,
      course,
      section,
      phoneNumbers,
      emailIds,
      parentName,
      parentEmailIds,
      parentPhoneNumbers,
    } = req.body;

    // Validate mandatory fields
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Student Name is mandatory' });
    }
    if (!rollNumber || !rollNumber.trim()) {
      return res.status(400).json({ error: 'Roll Number is mandatory (identifier column)' });
    }
    if (!course || !course.trim()) {
      return res.status(400).json({ error: 'Course is mandatory' });
    }

    // Check roll number uniqueness
    const all = await getAllStudents();
    const cleanRoll = rollNumber.trim().toLowerCase();
    const existing = all.find((s) => s.rollNumber && s.rollNumber.trim().toLowerCase() === cleanRoll);
    if (existing) {
      return res.status(400).json({
        error: `Roll number "${rollNumber.trim()}" already exists in student master database (assigned to ${existing.name}).`,
      });
    }

    const id = `student-${rollNumber.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;
    const newStudent: StudentMaster = {
      id,
      name: name.trim(),
      rollNumber: rollNumber.trim(),
      course: course.trim(),
      section: section?.trim() || undefined,
      phoneNumbers: Array.isArray(phoneNumbers) ? phoneNumbers.filter(Boolean) : [],
      emailIds: Array.isArray(emailIds) ? emailIds.filter(Boolean) : [],
      parentName: parentName?.trim() || undefined,
      parentEmailIds: Array.isArray(parentEmailIds) ? parentEmailIds.filter(Boolean) : [],
      parentPhoneNumbers: Array.isArray(parentPhoneNumbers) ? parentPhoneNumbers.filter(Boolean) : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveStudent(newStudent);
    return res.status(201).json({ student: saved });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create student record' });
  }
});

// PUT /api/students/:id - Update student record
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const existing = await getStudentById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    const {
      name,
      rollNumber,
      course,
      section,
      phoneNumbers,
      emailIds,
      parentName,
      parentEmailIds,
      parentPhoneNumbers,
    } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: 'Student Name cannot be empty' });
    }
    if (course !== undefined && !course.trim()) {
      return res.status(400).json({ error: 'Course cannot be empty' });
    }

    // If roll number changed, verify uniqueness
    if (rollNumber && rollNumber.trim().toLowerCase() !== existing.rollNumber.trim().toLowerCase()) {
      const all = await getAllStudents();
      const cleanRoll = rollNumber.trim().toLowerCase();
      const conflict = all.find((s) => s.id !== id && s.rollNumber && s.rollNumber.trim().toLowerCase() === cleanRoll);
      if (conflict) {
        return res.status(400).json({
          error: `Roll number "${rollNumber.trim()}" is already assigned to ${conflict.name}.`,
        });
      }
    }

    const updated: StudentMaster = {
      ...existing,
      name: name !== undefined ? name.trim() : existing.name,
      rollNumber: rollNumber !== undefined ? rollNumber.trim() : existing.rollNumber,
      course: course !== undefined ? course.trim() : existing.course,
      section: section !== undefined ? (section.trim() || undefined) : existing.section,
      phoneNumbers: phoneNumbers !== undefined ? (Array.isArray(phoneNumbers) ? phoneNumbers.filter(Boolean) : []) : existing.phoneNumbers,
      emailIds: emailIds !== undefined ? (Array.isArray(emailIds) ? emailIds.filter(Boolean) : []) : existing.emailIds,
      parentName: parentName !== undefined ? (parentName.trim() || undefined) : existing.parentName,
      parentEmailIds: parentEmailIds !== undefined ? (Array.isArray(parentEmailIds) ? parentEmailIds.filter(Boolean) : []) : existing.parentEmailIds,
      parentPhoneNumbers: parentPhoneNumbers !== undefined ? (Array.isArray(parentPhoneNumbers) ? parentPhoneNumbers.filter(Boolean) : []) : existing.parentPhoneNumbers,
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveStudent(updated);
    return res.json({ student: saved });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update student record' });
  }
});

// DELETE /api/students/:id - Delete student record
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const existing = await getStudentById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    await deleteStudent(id);
    return res.json({ success: true, message: 'Student deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete student' });
  }
});

// POST /api/students/upload-excel - Bulk upload student master with strict duplicate rejection
router.post('/upload-excel', async (req: Request, res: Response) => {
  try {
    const { base64Data } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'No Excel file data received' });
    }

    const buffer = Buffer.from(base64Data, 'base64');

    // Collect all existing roll numbers from DB to check collisions
    const allExisting = await getAllStudents();
    const existingRolls = new Map<string, string>();
    allExisting.forEach((s) => {
      if (s.rollNumber && s.rollNumber.trim()) {
        existingRolls.set(s.rollNumber.trim().toLowerCase(), s.name);
      }
    });

    // Pass existingRolls into processStudentExcel to catch collisions during row evaluation
    const summary = processStudentExcel(buffer, existingRolls);

    const finalSuccess: StudentMaster[] = [];
    for (const st of summary.createdRecords) {
      const cleanRoll = st.rollNumber.trim().toLowerCase();
      if (existingRolls.has(cleanRoll)) {
        summary.failedRows++;
        summary.failedRecords.push({
          rowNumber: st.sourceRowNumber || 0,
          data: {
            'Student Name': st.name,
            'Roll Number': st.rollNumber,
            'Course': st.course,
          },
          errors: [`Roll Number "${st.rollNumber}" already exists in Master Database (assigned to ${existingRolls.get(cleanRoll)}).`],
        });
        continue;
      }

      try {
        const saved = await saveStudent(st);
        existingRolls.set(cleanRoll, saved.name);
        finalSuccess.push(saved);
      } catch (saveErr: any) {
        summary.failedRows++;
        summary.failedRecords.push({
          rowNumber: st.sourceRowNumber || 0,
          data: {
            'Student Name': st.name,
            'Roll Number': st.rollNumber,
            'Course': st.course,
          },
          errors: [saveErr.message || `Failed to save student with Roll Number "${st.rollNumber}".`],
        });
      }
    }

    summary.successfulRows = finalSuccess.length;
    summary.createdRecords = finalSuccess;

    return res.json({ summary });
  } catch (err: any) {
    console.error('Excel processing error for students:', err);
    return res.status(500).json({ error: 'Failed to parse student master Excel: ' + err.message });
  }
});

// POST /api/students/clear-all - Clear all student records from persistent database
router.post('/clear-all', async (req: Request, res: Response) => {
  try {
    const { clearAllStudents } = await import('../db/firebase.ts');
    const count = await clearAllStudents();
    return res.json({
      success: true,
      count,
      message: `Successfully cleared ${count} student record${count === 1 ? '' : 's'} from database.`,
    });
  } catch (err: any) {
    console.error('Error clearing student records:', err);
    return res.status(500).json({ error: 'Failed to clear student records: ' + err.message });
  }
});

export default router;
