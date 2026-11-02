
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  // CREATE: Membuat akun sekaligus data karyawan
  async create(dto: CreateEmployeeDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    try {
      return await this.prisma.employee.create({
        data: {
          employeeCode: dto.employeeCode,
          fullName: dto.fullName,
          department: dto.department,
          position: dto.position,
          phone: dto.phone,

          user: {
            create: {
              email: dto.email,
              password: hashedPassword,
              role: 'EMPLOYEE',
            },
          },
        },
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          department: true,
          position: true,
          phone: true,
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              isActive: true,
            },
          },
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException(
          'Email atau kode karyawan sudah digunakan',
        );
      }

      throw error;
    }
  }

  // READ: Mengambil seluruh karyawan
  async findAll() {
    return this.prisma.employee.findMany({
      orderBy: {
        id: 'desc',
      },
      select: {
        id: true,
        employeeCode: true,
        fullName: true,
        department: true,
        position: true,
        phone: true,
        user: {
          select: {
            email: true,
            isActive: true,
          },
        },
      },
    });
  }

  // READ DETAIL: Mengambil satu karyawan berdasarkan ID
  async findOne(id: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        employeeCode: true,
        fullName: true,
        department: true,
        position: true,
        phone: true,
        user: {
          select: {
            email: true,
            isActive: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    return employee;
  }

  // UPDATE: Mengubah informasi karyawan
  async update(id: number, dto: UpdateEmployeeDto) {
    try {
      return await this.prisma.employee.update({
        where: { id },
        data: dto,
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          department: true,
          position: true,
          phone: true,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundException('Karyawan tidak ditemukan');
      }

      throw error;
    }
  }

  // DEACTIVATE: Menonaktifkan akun tanpa menghapus riwayat absensi
  async deactivate(id: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!employee) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    return this.prisma.user.update({
      where: { id: employee.userId },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        isActive: true,
      },
    });
  }

  async activate(id: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!employee) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    return this.prisma.user.update({
      where: { id: employee.userId },
      data: { isActive: true },
      select: {
        id: true,
        email: true,
        isActive: true,
      },
    });
  }
}
