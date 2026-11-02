import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Get,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { Request } from 'express';
import { extname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

import { AttendanceService } from './attendance.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

import { AttendanceQueryDto } from './dto/attendance-query.dto.js';

import { Param, ParseIntPipe } from '@nestjs/common';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
    role: 'ADMIN' | 'EMPLOYEE';
  };
}

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
  ) {}

  @Roles('EMPLOYEE')
  @Post()
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          const uploadPath = resolve(
            process.cwd(),
            'uploads',
            'attendance',
          );

          mkdirSync(uploadPath, { recursive: true });

          callback(null, uploadPath);
        },

        filename: (req, file, callback) => {
          const extension = extname(file.originalname).toLowerCase();

          callback(null, `${randomUUID()}${extension}`);
        },
      }),

      limits: {
        fileSize: 5 * 1024 * 1024,
      },

      fileFilter: (req, file, callback) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
        ];

        const allowedExtensions = ['.jpg', '.jpeg', '.png'];

        const extension = extname(file.originalname).toLowerCase();

        if (
          !allowedTypes.includes(file.mimetype) ||
          !allowedExtensions.includes(extension)
        ) {
          return callback(
            new BadRequestException(
              'Only JPG, JPEG, and PNG files are allowed',
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async submitAttendance(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.attendanceService.submit(req.user.userId, file);
  }

  @Roles('EMPLOYEE')
  @Get('me')
  async getMyAttendance(@Req() req: AuthenticatedRequest) {
  return this.attendanceService.findMyAttendance(req.user.userId);
  }

  @Roles('ADMIN')
  @Get()
  async getAllAttendance(
    @Query() query: AttendanceQueryDto,
  ) {
    return this.attendanceService.findAll(query);
  }

  @Roles('ADMIN', 'EMPLOYEE')
    @Get(':id/photo')
    async getAttendancePhoto(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    ) {
    return this.attendanceService.getPhoto(
        req.user.userId,
        req.user.role,
        id,
    );
    }
}