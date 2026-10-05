// Students / Mahasiswa Routes Controller
import { Router, Request, Response } from 'express';
import { requireTenant, authenticate, sendApiError } from '../middlewares/authMiddleware.ts';
import { StudentService } from '../services/studentService.ts';
import { OrderService } from '../services/orderService.ts';

export const studentRouter = Router();

studentRouter.use(requireTenant);
studentRouter.use(authenticate);

/**
 * GET /api/students/:studentId/orders - Student Order History
 */
studentRouter.get('/:studentId/orders', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const studentId = req.params.studentId;
    const user = req.user!;

    // Resolve student record if ID is provided
    const student = (await StudentService.getStudentById(tenantId, studentId)) || (await StudentService.getStudentByNim(tenantId, studentId));
    const targetNim = student?.nim || studentId;

    if (user.role !== 'PANITIA' && user.nim && targetNim.toLowerCase() !== user.nim.toLowerCase()) {
      return sendApiError(res, 403, 'FORBIDDEN', 'Akses ditolak: Anda hanya dapat melihat riwayat pesanan Anda sendiri.');
    }

    const orders = await OrderService.listOrdersByStudent(tenantId, targetNim);

    res.json({
      success: true,
      data: orders
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil riwayat pesanan mahasiswa.');
  }
});

/**
 * GET /api/students
 * - PANITIA: Lists all students for current tenant.
 * - MAHASISWA: Returns only their own record.
 */
studentRouter.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const user = req.user!;

    if (user.role === 'PANITIA') {
      const allStudents = await StudentService.listStudents(tenantId);
      return res.json({
        success: true,
        data: allStudents
      });
    }

    // Role is MAHASISWA: only return matching student record
    const myStudent = user.nim ? await StudentService.getStudentByNim(tenantId, user.nim) : null;
    return res.json({
      success: true,
      data: myStudent ? [myStudent] : []
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil data mahasiswa.');
  }
});

/**
 * GET /api/students/:id
 */
studentRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const studentId = req.params.id;
    const user = req.user!;

    const student = await StudentService.getStudentById(tenantId, studentId);
    if (!student) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Data mahasiswa tidak ditemukan.');
    }

    // Mahasiswa can only view their own record
    if (user.role !== 'PANITIA' && user.nim && student.nim.toLowerCase() !== user.nim.toLowerCase()) {
      return sendApiError(res, 403, 'FORBIDDEN', 'Akses ditolak: Anda hanya dapat melihat data mahasiswa milik Anda sendiri.');
    }

    res.json({
      success: true,
      data: student
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil data mahasiswa.');
  }
});

/**
 * POST /api/students
 */
studentRouter.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const user = req.user!;
    const { nama_lengkap, nim, kode_kelas, kelas, no_wa, status } = req.body;

    if (!nama_lengkap || !nim || !kode_kelas) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Field nama_lengkap, nim, dan kode_kelas wajib diisi.');
    }

    const newStudent = await StudentService.createStudent(
      tenantId,
      {
        nama_lengkap,
        nim,
        kode_kelas,
        kelas,
        no_wa,
        user_id: user.user_id,
        status: user.role === 'PANITIA' ? status : 'ACTIVE'
      },
      user.user_id
    );

    res.status(201).json({
      success: true,
      message: 'Data mahasiswa berhasil ditambahkan.',
      data: newStudent
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'CREATE_STUDENT_FAILED', err.message || 'Gagal menambahkan data mahasiswa.');
  }
});

/**
 * PUT /api/students/:id
 */
studentRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const studentId = req.params.id;
    const user = req.user!;

    const student = await StudentService.getStudentById(tenantId, studentId);
    if (!student) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Data mahasiswa tidak ditemukan.');
    }

    if (user.role !== 'PANITIA' && user.nim && student.nim.toLowerCase() !== user.nim.toLowerCase()) {
      return sendApiError(res, 403, 'FORBIDDEN', 'Akses ditolak: Anda hanya dapat mengubah data mahasiswa milik Anda.');
    }

    const payload = { ...req.body };
    if (user.role !== 'PANITIA') {
      delete payload.status;
      delete payload.nim;
    }

    const updated = await StudentService.updateStudent(tenantId, studentId, payload, user.user_id);

    res.json({
      success: true,
      message: 'Data mahasiswa berhasil diperbarui.',
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPDATE_STUDENT_FAILED', err.message || 'Gagal memperbarui data mahasiswa.');
  }
});

/**
 * POST /api/students/import - Bulk import students
 */
studentRouter.post('/import', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const user = req.user!;
    const { students, fileName, isDryRun } = req.body;

    if (!Array.isArray(students)) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Array mahasiswa wajib disertakan.');
    }

    const inserted: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      try {
        const nim = String(s.nim || s.NIM || '').trim();
        const nama = String(s.nama_lengkap || s.nama || s.name || s['Nama Lengkap'] || '').trim();
        const kelas = String(s.kelas || s.kode_kelas || s['Kelas'] || '22MJSP001').trim();
        if (!nim || !nama) {
          errors.push(`Baris ${i + 1}: NIM dan Nama Lengkap wajib diisi.`);
          continue;
        }
        if (!isDryRun) {
          const rec = await StudentService.createStudent(tenantId, {
            nama_lengkap: nama,
            nim,
            kode_kelas: kelas,
            kelas,
            no_wa: s.no_wa || s.phone || '',
            user_id: user.user_id,
            status: 'ACTIVE'
          }, user.user_id);
          inserted.push(rec);
        } else {
          inserted.push({ nim, nama_lengkap: nama, kelas });
        }
      } catch (e: any) {
        errors.push(`Baris ${i + 1}: ${e.message}`);
      }
    }

    res.json({
      success: true,
      message: `Impor berhasil (${inserted.length} data valid${errors.length > 0 ? `, ${errors.length} dilewati` : ''}).`,
      data: {
        successCount: inserted.length,
        errorCount: errors.length,
        errors,
        inserted
      }
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'IMPORT_FAILED', err.message || 'Gagal mengimpor data mahasiswa.');
  }
});

/**
 * POST /api/students/import-collective - Bulk import collective members
 */
studentRouter.post('/import-collective', (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const user = req.user!;
    const { members, fileName, isDryRun } = req.body;

    if (!Array.isArray(members)) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Array anggota kolektif wajib disertakan.');
    }

    const validMembers: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const nim = String(m.nim || m.NIM || '').trim();
      const nama = String(m.nama_lengkap || m.nama || m.name || m['Nama Lengkap'] || '').trim();
      const ukuran = String(m.ukuran || m.size || m['Ukuran'] || 'L').trim().toUpperCase();

      if (!nim || !nama) {
        errors.push(`Baris ${i + 1}: NIM dan Nama Lengkap wajib diisi.`);
        continue;
      }
      validMembers.push({
        nim,
        nama_lengkap: nama,
        ukuran,
        kelas: m.kelas || '22MJSP001',
        custom_name: m.custom_name || ''
      });
    }

    res.json({
      success: true,
      message: `Impor anggota kolektif berhasil (${validMembers.length} valid${errors.length > 0 ? `, ${errors.length} dilewati` : ''}).`,
      data: {
        successCount: validMembers.length,
        errorCount: errors.length,
        errors,
        inserted: validMembers
      }
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'IMPORT_FAILED', err.message || 'Gagal mengimpor anggota kolektif.');
  }
});
