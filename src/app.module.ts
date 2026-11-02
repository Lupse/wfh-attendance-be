import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module.js';
import { EmployeesModule } from './employees/employees.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AttendanceModule } from './attendances/attendance.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    EmployeesModule,
    AuthModule,
    AttendanceModule,
  ],
})
export class AppModule {}