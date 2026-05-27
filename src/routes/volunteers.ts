/**
 * CoreCount — Volunteer Submissions API Routes
 * POST /api/v1/volunteers        — submit volunteer onboarding form
 * GET  /api/v1/volunteers        — list all volunteer submissions
 */

import { Router, Request, Response } from 'express';
import db from '../db/db';
import type { VolunteerRow } from '../db/db';

const router = Router();

// POST /api/v1/volunteers — submit volunteer onboarding
router.post('/', (req: Request, res: Response) => {
  const {
    volunteerName,
    emergencyContact,
    emergencyPhone,
    relationship,
    signatureCapture,
    isMinor,
    parentSignature,
  } = req.body as {
    volunteerName?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
    relationship?: string;
    signatureCapture?: string;
    isMinor?: boolean;
    parentSignature?: string;
  };

  // Validate required fields
  if (!volunteerName?.trim()) return res.status(400).json({ error: 'volunteerName is required.' });
  if (!emergencyContact?.trim()) return res.status(400).json({ error: 'emergencyContact is required.' });
  if (!emergencyPhone?.trim()) return res.status(400).json({ error: 'emergencyPhone is required.' });
  if (!relationship?.trim()) return res.status(400).json({ error: 'relationship is required.' });
  if (!signatureCapture?.trim()) return res.status(400).json({ error: 'signatureCapture is required.' });

  // If minor, parent signature is required
  if (isMinor && !parentSignature?.trim()) {
    return res.status(400).json({ error: 'parentSignature is required for minor volunteers.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO volunteer_submissions
        (volunteer_name, emergency_contact, emergency_phone, relationship, signature_capture, is_minor, parent_signature)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      volunteerName.trim(),
      emergencyContact.trim(),
      emergencyPhone.trim(),
      relationship.trim(),
      signatureCapture.trim(),
      isMinor ? 1 : 0,
      parentSignature?.trim() ?? null,
    );

    const submission = db.prepare('SELECT * FROM volunteer_submissions WHERE id = ?').get(result.lastInsertRowid) as VolunteerRow;
    return res.status(201).json({ submission, message: 'Volunteer submission recorded successfully.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
});

// GET /api/v1/volunteers — list all volunteer submissions
router.get('/', (_req: Request, res: Response) => {
  const submissions = db.prepare('SELECT * FROM volunteer_submissions ORDER BY submission_date DESC').all() as VolunteerRow[];
  return res.json({ submissions, total: submissions.length });
});

export default router;
