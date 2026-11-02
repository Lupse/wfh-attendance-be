import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { unlink } from 'node:fs/promises';
import { AttendanceQueryDto } from './dto/attendance-query.dto.js';

import { StreamableFile } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

//   Submit Attendance
  async submit(userId: number, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Attendance photo is required');
    }

    try {
      // 1. Cari akun dan data karyawan berdasarkan JWT
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { employee: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.isActive) {
        throw new ForbiddenException('Account is inactive');
      }

      if (!user.employee) {
        throw new NotFoundException('Employee data not found');
      }

      // 2. Ambil tanggal berdasarkan zona waktu Jakarta
      const now = new Date();

      const dateParts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(now);

      const getPart = (type: string) =>
        dateParts.find((part) => part.type === type)?.value;

      const year = getPart('year');
      const month = getPart('month');
      const day = getPart('day');

      if (!year || !month || !day) {
        throw new Error('Failed to determine attendance date');
      }

      const dateString = `${year}-${month}-${day}`;

      // Date-only disimpan sebagai tanggal kalender
      const attendanceDate = new Date(
        `${dateString}T00:00:00.000Z`,
      );

      // 3. Simpan data attendance
      const attendance = await this.prisma.attendance.create({
        data: {
          employeeId: user.employee.id,
          attendanceDate,
          attendanceTime: now,
          photoPath: `uploads/attendance/${file.filename}`,
        },
        include: {
          employee: {
            select: {
              employeeCode: true,
              fullName: true,
            },
          },
        },
      });

      return {
        message: 'Attendance submitted successfully',
        data: attendance,
      };
    } catch (error) {
      // Hapus foto jika penyimpanan absensi gagal
      await unlink(file.path).catch(() => undefined);

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'You have already submitted attendance today',
        );
      }

      throw error;
    }
  }

//   View Attendance
  async findMyAttendance(userId: number) {
  // 1. Cari akun berdasarkan JWT
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      employee: true,
    },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  if (!user.isActive) {
    throw new ForbiddenException('Account is inactive');
  }

  if (!user.employee) {
    throw new NotFoundException('Employee data not found');
  }

  // 2. Ambil seluruh absensi milik Employee
  const attendances = await this.prisma.attendance.findMany({
    where: {
      employeeId: user.employee.id,
    },
    orderBy: {
      attendanceDate: 'desc',
    },
    select: {
      id: true,
      attendanceDate: true,
      attendanceTime: true,
      photoPath: true,
      createdAt: true,
    },
  });

  // 3. Format tanggal sebagai YYYY-MM-DD
  return {
    message: 'Attendance history retrieved successfully',
    total: attendances.length,
    data: attendances.map((attendance) => ({
      ...attendance,
      attendanceDate: attendance.attendanceDate
        .toISOString()
        .slice(0, 10),
    })),
  };
  }

//   Tampilkan semua data absensi dengan filter
  async findAll(query: AttendanceQueryDto) {
  const {
    date,
    employeeId,
    search,
    page = 1,
    limit = 10,
  } = query;

  const skip = (page - 1) * limit;

  // Filter berdasarkan tanggal
  let attendanceDate: Date | undefined;

  if (date) {
    attendanceDate = new Date(`${date}T00:00:00.000Z`);
  }

  // Filter data absensi
  const where: Prisma.AttendanceWhereInput = {
    ...(attendanceDate && { attendanceDate }),
    ...(employeeId && { employeeId }),
    ...(search && {
      employee: {
        OR: [
          {
            fullName: {
              contains: search,
            },
          },
          {
            employeeCode: {
              contains: search,
            },
          },
        ],
      },
    }),
  };

  // Ambil data dan total secara bersamaan
  const [attendances, total] = await this.prisma.$transaction([
    this.prisma.attendance.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { attendanceDate: 'desc' },
        { attendanceTime: 'desc' },
      ],
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            department: true,
            position: true,
          },
        },
      },
    }),
    this.prisma.attendance.count({ where }),
  ]);

  return {
    message: 'Attendance records retrieved successfully',
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    data: attendances.map((attendance) => ({
      ...attendance,
      attendanceDate: attendance.attendanceDate
        .toISOString()
        .slice(0, 10),
    })),
  };
  }

//   Tampilkan foto absensi
  async getPhoto(
  userId: number,
  role: 'ADMIN' | 'EMPLOYEE',
  attendanceId: number,
) {
  const attendance = await this.prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: {
      employee: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!attendance) {
    throw new NotFoundException('Attendance record not found');
  }

  // Employee hanya boleh melihat foto miliknya sendiri.
  if (role === 'EMPLOYEE' && attendance.employee.userId !== userId) {
    throw new ForbiddenException(
      'You are not allowed to access this attendance photo',
    );
  }

  const uploadDirectory = resolve(
    process.cwd(),
    'uploads',
    'attendance',
  );

  const filePath = resolve(process.cwd(), attendance.photoPath);

  // Pastikan path file tetap berada di folder upload.
  if (!filePath.startsWith(uploadDirectory + sep)) {
    throw new NotFoundException('Attendance photo not found');
  }

  try {
    await access(filePath);
  } catch {
    throw new NotFoundException('Attendance photo not found');
  }

  const extension = extname(filePath).toLowerCase();

  const contentType =
    extension === '.png' ? 'image/png' : 'image/jpeg';

  return new StreamableFile(createReadStream(filePath), {
    type: contentType,
    disposition: `inline; filename="attendance-${attendanceId}${extension}"`,
  });
}
}