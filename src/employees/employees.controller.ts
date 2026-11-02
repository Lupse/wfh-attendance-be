
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { EmployeesService } from './employees.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';

import { UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
  ) {}

  // POST /employees
  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  // GET /employees
  @Get()
  findAll() {
    return this.employeesService.findAll();
  }

  // GET /employees/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.findOne(id);
  }

  // PATCH /employees/:id
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(id, dto);
  }

  // PATCH /employees/:id/deactivate
  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.deactivate(id);
  }

  // PATCH /employees/:id/activate
  @Patch(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.activate(id);
  }
}
